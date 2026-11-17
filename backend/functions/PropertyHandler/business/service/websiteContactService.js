import { parseContactMessage } from "./websiteContactMessage.js";
import { SITE_PAGES_ENTITLEMENT } from "./websiteElitePageSettings.js";
import { CognitoRepository } from "../../data/repository/cognitoRepository.js";
import { EmailNotificationRepository } from "../../data/repository/emailNotificationRepository.js";
import { PROPERTY_STATUS } from "../../util/propertyStatus.js";
import { withinTimeLimit } from "../../util/timeLimit.js";
import { WebsiteContactError, WEBSITE_CONTACT_ERROR_CODES as CODES } from "../../util/exception/WebsiteContactError.js";

export const WEBSITE_CONTACT_ENTITLEMENT = SITE_PAGES_ENTITLEMENT;
export const WEBSITE_CONTACT_SENT_EVENT = "SITE_CONTACT_MESSAGE_SENT";
export const MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR = 20;
export const CONTACT_EMAIL_TIMEOUT_MS = 8000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_SUBJECT_NAME_LENGTH = 80;
const PUBLISHED_SITE_STATUS = "PUBLISHED";

export const isWebsiteContactEnabled = () =>
  String(process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED || "").trim() === "true";

const NOT_SENT = "Your message could not be sent. Please try again later.";
const MESSAGES = Object.freeze({
  [CODES.CONTACT_UNAVAILABLE]: "Messages cannot be sent from this website yet. Your message was not sent.",
  [CODES.SITE_NOT_FOUND]: "This website cannot receive messages. Your message was not sent.",
  [CODES.PROPERTY_NOT_FOUND]: "This property is not on this website. Your message was not sent.",
  [CODES.RATE_LIMITED]: "Too many messages were sent. Your message was not sent. Please try again later.",
  [CODES.MESSAGE_NOT_SENT]: NOT_SENT,
  [CODES.INTERNAL_ERROR]: NOT_SENT,
});

export const websiteContactFailure = (code) => new WebsiteContactError(code, MESSAGES[code]);

const oneLine = (value) =>
  String(value ?? "")
    .replaceAll(/[\s\p{Cc}]+/gu, " ")
    .trim();
const titleOf = (snapshot) => oneLine(snapshot?.property?.title);

const buildSubject = (name) =>
  `New message from your website: ${Array.from(name).slice(0, MAX_SUBJECT_NAME_LENGTH).join("")}`;

const buildBody = ({ siteName, propertyTitle, message }) => `Hello,

A guest sent you a message through your website "${siteName}".

About: ${propertyTitle || "no specific property"}
Name: ${message.name}
Email: ${message.email}
Phone: ${message.phone || "not given"}

Message:
${message.message}

Reply to this email to answer the guest.`;

export class WebsiteContactService {
  constructor({
    siteRepository,
    eventRepository,
    pageSettings,
    sitePropertySnapshots,
    cognitoRepository = new CognitoRepository(),
    mailer = new EmailNotificationRepository(),
    emailTimeoutMs = CONTACT_EMAIL_TIMEOUT_MS,
    clock = Date.now,
  }) {
    this.siteRepository = siteRepository;
    this.eventRepository = eventRepository;
    this.pageSettings = pageSettings;
    this.sitePropertySnapshots = sitePropertySnapshots;
    this.cognitoRepository = cognitoRepository;
    this.mailer = mailer;
    this.emailTimeoutMs = emailTimeoutMs;
    this.clock = clock;
  }

  async sendMessage({ body, requestId }) {
    if (!isWebsiteContactEnabled()) throw websiteContactFailure(CODES.CONTACT_UNAVAILABLE);
    const message = parseContactMessage(body);
    const site = await this.loadContactableSite(message.siteId);
    const property = await this.resolveProperty(site, message.propertyId);
    await this.assertHostHasRoom(site);
    const hostEmail = await this.readHostEmail(site);
    await this.deliver({ site, property, message, hostEmail });
    await this.recordSent({ site, property, requestId });
    return { status: "SENT", requestId };
  }

  async loadContactableSite(siteId) {
    const site = await this.siteRepository.getSiteById(siteId);
    const isContactable =
      site?.status === PUBLISHED_SITE_STATUS &&
      (await this.pageSettings.readEntitlements(site.hostId)).includes(WEBSITE_CONTACT_ENTITLEMENT);
    if (!isContactable) throw websiteContactFailure(CODES.SITE_NOT_FOUND);
    return site;
  }

  async resolveProperty(site, propertyId) {
    if (!propertyId) return { propertyId: null, title: "" };
    const title =
      propertyId === site.propertyId
        ? await this.readMainPropertyTitle(site)
        : await this.readServedPropertyTitle(site, propertyId);
    if (title === null) throw websiteContactFailure(CODES.PROPERTY_NOT_FOUND);
    return { propertyId, title };
  }

  async readMainPropertyTitle(site) {
    const [state] = await this.siteRepository.getSitePropertyStates([site.propertyId]);
    const isServable = state?.hostId === site.hostId && state?.status === PROPERTY_STATUS.ACTIVE;
    return isServable ? titleOf(site.publishedPropertySnapshot) : null;
  }

  async readServedPropertyTitle(site, propertyId) {
    const overrides = await this.pageSettings.servePageSettingsForHost({
      hostId: site.hostId,
      overrides: site.publishedContentOverrides,
    });
    const served = await this.sitePropertySnapshots.serveForRender({ site, overrides });
    const entry = served.find((candidate) => candidate.propertyId === propertyId && !candidate.isMainProperty);
    return entry ? titleOf(entry.propertySnapshot) : null;
  }

  async assertHostHasRoom(site) {
    let sentLastHour;
    try {
      sentLastHour = await this.eventRepository.countEventsSince({
        hostId: site.hostId,
        eventType: WEBSITE_CONTACT_SENT_EVENT,
        since: this.clock() - HOUR_MS,
      });
    } catch (error) {
      console.error(`[WebsiteContact] the recent messages for site ${site.id} could not be counted.`, error);
      throw websiteContactFailure(CODES.MESSAGE_NOT_SENT);
    }
    if (sentLastHour >= MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR) throw websiteContactFailure(CODES.RATE_LIMITED);
  }

  async readHostEmail(site) {
    try {
      const user = await this.cognitoRepository.getUserById(site.hostId);
      const email = user?.UserAttributes?.find((attribute) => attribute?.Name === "email")?.Value;
      if (email) return email;
      console.error(`[WebsiteContact] the host of site ${site.id} has no email address.`);
    } catch (error) {
      console.error(`[WebsiteContact] the email address of the host of site ${site.id} could not be read.`, error);
    }
    throw websiteContactFailure(CODES.MESSAGE_NOT_SENT);
  }

  async deliver({ site, property, message, hostEmail }) {
    const siteName = oneLine(site.siteName);
    const email = {
      toEmail: hostEmail,
      replyTo: message.email,
      subject: buildSubject(property.title || siteName || "your website"),
      body: buildBody({ siteName, propertyTitle: property.title, message }),
    };
    try {
      await withinTimeLimit(
        this.mailer.sendTextEmail(email),
        this.emailTimeoutMs,
        () => new Error("The email service did not answer in time.")
      );
    } catch (error) {
      console.error(`[WebsiteContact] the message for site ${site.id} was not sent.`, error);
      throw websiteContactFailure(CODES.MESSAGE_NOT_SENT);
    }
  }

  async recordSent({ site, property, requestId }) {
    try {
      await this.eventRepository.recordEvent({
        propertyId: property.propertyId || site.propertyId,
        hostId: site.hostId,
        eventType: WEBSITE_CONTACT_SENT_EVENT,
        payload: { requestId, siteId: site.id, propertyId: property.propertyId },
      });
    } catch (error) {
      console.error(`[WebsiteContact] a sent message for site ${site.id} was not recorded.`, error);
    }
  }
}
