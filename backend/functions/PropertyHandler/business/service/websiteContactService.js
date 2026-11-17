import { parseContactMessage } from "./websiteContactMessage.js";
import { SITE_PAGES_ENTITLEMENT, SITE_PROPERTIES_ENTITLEMENT } from "./websiteElitePageSettings.js";
import { CognitoRepository } from "../../data/repository/cognitoRepository.js";
import { EmailNotificationRepository } from "../../data/repository/emailNotificationRepository.js";
import { PROPERTY_STATUS } from "../../util/propertyStatus.js";
import { withinTimeLimit } from "../../util/timeLimit.js";
import { WebsiteContactError, WEBSITE_CONTACT_ERROR_CODES as CODES } from "../../util/exception/WebsiteContactError.js";

export const WEBSITE_CONTACT_ENTITLEMENT = SITE_PAGES_ENTITLEMENT;
export const WEBSITE_CONTACT_EVENT = "SITE_CONTACT_MESSAGE_REQUESTED";
export const MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR = 20;
export const CONTACT_PREPARE_TIMEOUT_MS = 15000;
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
  [CODES.MESSAGE_NOT_CONFIRMED]:
    "We could not confirm that your message was sent. Please wait a few minutes before you send it again.",
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

const failClosed = async (site, step, work) => {
  try {
    return await work();
  } catch (error) {
    console.error(`[WebsiteContact] ${step} for site ${site.id} failed, so nothing was sent.`, error);
    throw websiteContactFailure(CODES.MESSAGE_NOT_SENT);
  }
};

export class WebsiteContactService {
  constructor({
    siteRepository,
    eventRepository,
    pageSettings,
    sitePropertySnapshots,
    cognitoRepository = new CognitoRepository(),
    mailer = new EmailNotificationRepository(),
    prepareTimeoutMs = CONTACT_PREPARE_TIMEOUT_MS,
    emailTimeoutMs = CONTACT_EMAIL_TIMEOUT_MS,
    clock = Date.now,
  }) {
    this.siteRepository = siteRepository;
    this.eventRepository = eventRepository;
    this.pageSettings = pageSettings;
    this.sitePropertySnapshots = sitePropertySnapshots;
    this.cognitoRepository = cognitoRepository;
    this.mailer = mailer;
    this.prepareTimeoutMs = prepareTimeoutMs;
    this.emailTimeoutMs = emailTimeoutMs;
    this.clock = clock;
  }

  async sendMessage({ body, requestId }) {
    if (!isWebsiteContactEnabled()) throw websiteContactFailure(CODES.CONTACT_UNAVAILABLE);
    const message = parseContactMessage(body);
    const prepared = await withinTimeLimit(this.prepare(message, requestId), this.prepareTimeoutMs, () =>
      websiteContactFailure(CODES.MESSAGE_NOT_SENT)
    );
    await this.deliver({ ...prepared, message });
    return { status: "SENT", requestId };
  }

  async prepare(message, requestId) {
    const { site, entitlements } = await this.loadContactableSite(message.siteId);
    const property = await this.resolveProperty(site, entitlements, message.propertyId);
    const hostEmail = await this.readHostEmail(site);
    await this.reserveHostRoom({ site, property, requestId });
    return { site, property, hostEmail };
  }

  async loadContactableSite(siteId) {
    const site = await this.siteRepository.getSiteById(siteId);
    const entitlements =
      site?.status === PUBLISHED_SITE_STATUS ? await this.pageSettings.readEntitlements(site.hostId) : [];
    if (!entitlements.includes(WEBSITE_CONTACT_ENTITLEMENT)) throw websiteContactFailure(CODES.SITE_NOT_FOUND);
    return { site, entitlements };
  }

  async resolveProperty(site, entitlements, propertyId) {
    if (!propertyId) return { propertyId: null, title: "" };
    const title =
      propertyId === site.propertyId
        ? await this.readMainPropertyTitle(site)
        : await this.readServedPropertyTitle(site, entitlements, propertyId);
    if (title === null) throw websiteContactFailure(CODES.PROPERTY_NOT_FOUND);
    return { propertyId, title };
  }

  async readMainPropertyTitle(site) {
    const [state] = await this.siteRepository.getSitePropertyStates([site.propertyId]);
    const isServable = state?.hostId === site.hostId && state?.status === PROPERTY_STATUS.ACTIVE;
    return isServable ? titleOf(site.publishedPropertySnapshot) : null;
  }

  async readServedPropertyTitle(site, entitlements, propertyId) {
    const servesList = entitlements.includes(SITE_PROPERTIES_ENTITLEMENT);
    const overrides = servesList ? site.publishedContentOverrides : {};
    const served = await this.sitePropertySnapshots.serveForRender({ site, overrides });
    const entry = served.find((candidate) => candidate.propertyId === propertyId && !candidate.isMainProperty);
    return entry ? titleOf(entry.propertySnapshot) : null;
  }

  async readHostEmail(site) {
    const user = await failClosed(site, "reading the host's address", () =>
      this.cognitoRepository.getUserById(site.hostId)
    );
    const email = user?.UserAttributes?.find((attribute) => attribute?.Name === "email")?.Value;
    if (email) return email;
    console.error(`[WebsiteContact] the host of site ${site.id} has no email address, so nothing was sent.`);
    throw websiteContactFailure(CODES.MESSAGE_NOT_SENT);
  }

  async reserveHostRoom({ site, property, requestId }) {
    const since = this.clock() - HOUR_MS;
    const requestedLastHour = await failClosed(site, "counting the recent messages", () =>
      this.eventRepository.countEventsSince({ hostId: site.hostId, eventType: WEBSITE_CONTACT_EVENT, since })
    );
    if (requestedLastHour >= MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR) throw websiteContactFailure(CODES.RATE_LIMITED);
    await failClosed(site, "recording the message", () =>
      this.eventRepository.recordEvent({
        propertyId: property.propertyId || site.propertyId,
        hostId: site.hostId,
        eventType: WEBSITE_CONTACT_EVENT,
        payload: { requestId, siteId: site.id, propertyId: property.propertyId },
      })
    );
  }

  async deliver({ site, property, message, hostEmail }) {
    const siteName = oneLine(site.siteName);
    const email = {
      toEmail: hostEmail,
      replyTo: message.email,
      subject: buildSubject(property.title || siteName || "your website"),
      body: buildBody({ siteName, propertyTitle: property.title, message }),
    };
    let timedOut = false;
    try {
      await withinTimeLimit(this.mailer.sendTextEmail(email), this.emailTimeoutMs, () => {
        timedOut = true;
        return new Error("The email service did not answer in time.");
      });
    } catch (error) {
      console.error(`[WebsiteContact] the message for site ${site.id} was not confirmed.`, error);
      const mayHaveBeenSent = timedOut || error?.deliveryUnknown === true;
      throw websiteContactFailure(mayHaveBeenSent ? CODES.MESSAGE_NOT_CONFIRMED : CODES.MESSAGE_NOT_SENT);
    }
  }
}
