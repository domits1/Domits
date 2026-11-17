import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import { MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR } from "../../functions/PropertyHandler/business/service/websiteContactService.js";
import { EmailNotificationRepository } from "../../functions/PropertyHandler/data/repository/emailNotificationRepository.js";
import {
  EXISTING_SITE,
  PAID_ELITE_ROW,
  buildExistingSiteController,
  buildRatePlanRepository,
  ratePlanRow,
} from "./support/existingSiteRender.js";

const HOST = EXISTING_SITE.hostId;
const MAIN = EXISTING_SITE.propertyId;
const [OWN, FOREIGN, INACTIVE, REMOVED] = ["property-own", "property-foreign", "property-inactive", "property-removed"];
const HOST_EMAIL = "amara@example.com";
const NOW = 1782300000000;
const LIST = [MAIN, OWN, FOREIGN, INACTIVE, REMOVED].map((propertyId, index) => ({ propertyId, slug: `p-${index}` }));
const ELITE_SITE = Object.freeze({
  ...EXISTING_SITE,
  publishedContentOverrides: { ...EXISTING_SITE.publishedContentOverrides, siteProperties: LIST },
});
const SNAPSHOTS = [OWN, FOREIGN, INACTIVE, REMOVED].map((propertyId) => ({
  propertyId,
  propertySnapshot: { property: { id: propertyId, title: propertyId === OWN ? "Beach\nhouse" : propertyId } },
}));
const STATES = new Map([
  [MAIN, { hostId: HOST, status: "ACTIVE" }],
  [OWN, { hostId: HOST, status: "ACTIVE" }],
  [FOREIGN, { hostId: "host-other", status: "ACTIVE" }],
  [INACTIVE, { hostId: HOST, status: "INACTIVE" }],
]);
const MESSAGE = 'Is it free in May?\n<b>bold</b> <script>alert("x")</script>';
const GUEST = Object.freeze({
  siteId: ELITE_SITE.id,
  name: "Noor de Vries",
  email: "noor@example.nl",
  phone: "+31 6 123456",
  message: MESSAGE,
});
const NOT_SENT = "Your message could not be sent. Please try again later.";
const DOWN = new Error("down");

const lambdaAnswer = (answer) => ({ StatusCode: 200, Payload: new TextEncoder().encode(JSON.stringify(answer)) });
const confirmingReplyTo = async (command) => {
  const { replyTo } = JSON.parse(command.input.Payload).body;
  return lambdaAnswer({ statusCode: 200, body: JSON.stringify({ message: "Email sent successfully!", replyTo }) });
};

const buildContact = ({ site = ELITE_SITE, plan = PAID_ELITE_ROW, states = STATES, sentLastHour = 0 } = {}) => {
  const ratePlanRepository = buildRatePlanRepository(plan);
  const controller = buildExistingSiteController({ site, ratePlanRepository });
  const siteRepository = {
    getSiteById: jest.fn(async (siteId) => (site?.id === siteId ? site : null)),
    getPublishedSitePropertySnapshots: jest.fn(async () => SNAPSHOTS),
    getSitePropertyStates: jest.fn(async (ids) =>
      ids.filter((id) => states.has(id)).map((id) => ({ id, ...states.get(id) }))
    ),
  };
  const eventRepository = { recordEvent: jest.fn(async () => {}), countEventsSince: jest.fn(async () => sentLastHour) };
  controller.directBookingWebsiteSiteRepository = siteRepository;
  controller.directBookingWebsiteEventRepository = eventRepository;
  const ratePlanService = controller.directBookingWebsiteRatePlanService;
  controller.websiteElitePageSettings = new WebsiteElitePageSettings(ratePlanService, { planReadTimeoutMs: 20 });
  const lambdaClient = { send: jest.fn(confirmingReplyTo) };
  const service = controller.getWebsiteContactService();
  service.cognitoRepository = {
    getUserById: jest.fn(async () => ({ UserAttributes: [{ Name: "email", Value: HOST_EMAIL }] })),
  };
  service.mailer = new EmailNotificationRepository({ lambdaClient });
  service.emailTimeoutMs = 20;
  service.clock = () => NOW;

  const send = (body = GUEST, raw = JSON.stringify(body)) =>
    controller.sendPublicWebsiteContactMessage({ body: raw, requestContext: { requestId: "req-1" } });
  const emails = () => lambdaClient.send.mock.calls.map(([command]) => JSON.parse(command.input.Payload).body);
  return { controller, service, siteRepository, eventRepository, ratePlanRepository, lambdaClient, send, emails };
};

const parse = (response) => JSON.parse(response.body);
const expectRefusal = (response, statusCode, code) => {
  expect(response.statusCode).toBe(statusCode);
  expect(parse(response).error).toMatchObject({ code, requestId: "req-1" });
};

let logged;

beforeEach(() => {
  process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED = "true";
  logged = [jest.spyOn(console, "error"), jest.spyOn(console, "log")].map((spy) => spy.mockImplementation(() => {}));
});

afterEach(() => {
  delete process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED;
  jest.restoreAllMocks();
});

describe("sending a contact message from an Elite website", () => {
  it("emails the site's host as plain text with the guest as reply-to, whatever else the body names", async () => {
    const { send, emails, service } = buildContact();
    const forged = { hostId: "host-other", hostEmail: "x@example.com", toEmail: "x@example.com", subject: "Prize" };
    const response = await send({ ...GUEST, ...forged });
    expect(response.statusCode).toBe(200);
    expect(parse(response)).toEqual({ status: "SENT", requestId: "req-1" });
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(service.cognitoRepository.getUserById).toHaveBeenCalledWith(HOST);
    expect(emails()).toEqual([
      {
        toEmail: HOST_EMAIL,
        replyTo: GUEST.email,
        subject: "New message from your website: Wellness Villa Bisous",
        body: `Hello,

A guest sent you a message through your website "Wellness Villa Bisous".

About: no specific property
Name: Noor de Vries
Email: noor@example.nl
Phone: +31 6 123456

Message:
${GUEST.message}

Reply to this email to answer the guest.`,
      },
    ]);
  });

  it("records one sent event without the guest's details, and logs none of them", async () => {
    const { send, eventRepository } = buildContact();
    await send({ ...GUEST, propertyId: OWN });
    expect(eventRepository.recordEvent.mock.calls).toEqual([
      [
        {
          propertyId: OWN,
          hostId: HOST,
          eventType: "SITE_CONTACT_MESSAGE_SENT",
          payload: { requestId: "req-1", siteId: ELITE_SITE.id, propertyId: OWN },
        },
      ],
    ]);
    const output = JSON.stringify(logged.flatMap((spy) => spy.mock.calls));
    [GUEST.name, GUEST.email, GUEST.phone, "free in May"].forEach((detail) => expect(output).not.toContain(detail));
  });

  it.each([
    ["the main property", MAIN, "Wellness Villa Bisous"],
    ["another property of the site, from its published snapshot, on one line", OWN, "Beach house"],
  ])("names %s", async (_label, propertyId, title) => {
    const { send, emails } = buildContact();
    expect((await send({ ...GUEST, propertyId })).statusCode).toBe(200);
    expect(emails()[0].subject).toBe(`New message from your website: ${title}`);
    expect(emails()[0].body).toContain(`About: ${title}\n`);
  });

  it("cuts a long name in the subject to 80 characters and falls back to your website without a name", async () => {
    const longName = `${"Villa ".repeat(20)}end`;
    const named = buildContact({ site: { ...ELITE_SITE, siteName: longName } });
    const unnamed = buildContact({ site: { ...ELITE_SITE, siteName: " " } });
    await named.send();
    await unnamed.send();
    expect(named.emails()[0].subject).toBe(`New message from your website: ${longName.slice(0, 80)}`);
    expect(unnamed.emails()[0].subject).toBe("New message from your website: your website");
  });

  it("still answers SENT when the sent event cannot be recorded, because the email went out", async () => {
    const { send, eventRepository, emails } = buildContact();
    eventRepository.recordEvent.mockRejectedValue(new Error("event store down"));
    expect((await send()).statusCode).toBe(200);
    expect(emails()).toHaveLength(1);
  });

  it.each([
    ["opens with the Contact page entitlement", ["website.unlimited_pages"], 200],
    ["stays closed with only the several properties entitlement", ["website.multi_property"], 404],
  ])("%s", async (_label, entitlements, statusCode) => {
    const contact = buildContact();
    contact.controller.websiteElitePageSettings.readEntitlements = jest.fn(async () => entitlements);
    expect((await contact.send()).statusCode).toBe(statusCode);
  });
});

describe("refusing a site that cannot receive messages, as if the route does not exist for it", () => {
  it.each([
    ["an Essentials site", { plan: ratePlanRow() }],
    ["a site whose host has no plan row", { plan: null }],
    ["an Elite plan that has ended", { plan: { ...PAID_ELITE_ROW, effective_until: new Date(NOW) } }],
    ["a draft site", { site: { ...ELITE_SITE, status: "DRAFT" } }],
    ["a preview site", { site: { ...ELITE_SITE, status: "PREVIEW" } }],
    ["a suspended site", { site: { ...ELITE_SITE, status: "SUSPENDED" } }],
  ])("answers %s exactly like an unknown site and sends nothing", async (_label, options) => {
    const { send, emails } = buildContact(options);
    const response = await send();
    expect(response).toEqual(await buildContact({ site: null }).send());
    expectRefusal(response, 404, "site_not_found");
    expect(emails()).toHaveLength(0);
  });

  it.each([
    ["fails", (read) => read.mockRejectedValue(DOWN)],
    ["does not answer in time", (read) => read.mockReturnValue(new Promise(() => {}))],
  ])("answers 404 and sends nothing when the plan read %s", async (_label, breakRead) => {
    const contact = buildContact();
    breakRead(contact.ratePlanRepository.findCurrentByAccountId);
    expectRefusal(await contact.send(), 404, "site_not_found");
    expect(contact.emails()).toHaveLength(0);
  });

  it.each([undefined, "false", "TRUE", "1"])("reads and sends nothing while the feature flag is %s", async (flag) => {
    if (flag === undefined) delete process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED;
    else process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED = flag;
    const { send, siteRepository, emails } = buildContact();
    const response = await send();
    expectRefusal(response, 503, "contact_unavailable");
    expect(parse(response).error.message).toBe(
      "Messages cannot be sent from this website yet. Your message was not sent."
    );
    expect(siteRepository.getSiteById).not.toHaveBeenCalled();
    expect(emails()).toHaveLength(0);
  });
});

describe("refusing a property that the site does not serve", () => {
  const withMain = (state) => ({ states: new Map([...STATES, [MAIN, state]]) });
  const unlisted = { site: { ...ELITE_SITE, publishedContentOverrides: EXISTING_SITE.publishedContentOverrides } };
  const snapshotsDown = ({ siteRepository }) =>
    siteRepository.getPublishedSitePropertySnapshots.mockRejectedValue(DOWN);
  const listPlanDown = ({ ratePlanRepository }) =>
    ratePlanRepository.findCurrentByAccountId.mockResolvedValueOnce(PAID_ELITE_ROW).mockRejectedValueOnce(DOWN);

  it.each([
    ["of another host", FOREIGN],
    ["that is not active", INACTIVE],
    ["that was removed", REMOVED],
    ["that is not on the site's list", "property-unlisted"],
    ["of the host, on a site that does not list it", OWN, unlisted],
    ["that is the main one but no longer active", MAIN, withMain({ hostId: HOST, status: "INACTIVE" })],
    ["that is the main one but now another host's", MAIN, withMain({ hostId: "host-other", status: "ACTIVE" })],
    ["whose snapshots cannot be read", OWN, {}, snapshotsDown],
    ["when the plan read for the list fails after the site check", OWN, {}, listPlanDown],
  ])(
    "answers 404 for a property %s and sends nothing",
    async (_label, propertyId, options = {}, breakIt = () => {}) => {
      const contact = buildContact(options);
      breakIt(contact);
      expectRefusal(await contact.send({ ...GUEST, propertyId }), 404, "property_not_found");
      expect(contact.emails()).toHaveLength(0);
    }
  );
});

describe("telling the guest the message was not sent", () => {
  const never = () => new Promise(() => {});
  const answering = (answer) => (c) => c.lambdaClient.send.mockResolvedValue(lambdaAnswer(answer));

  it.each([
    ["the email service answers 500", 1, answering({ statusCode: 500 })],
    ["the email service sends without the reply-to, as it does today", 1, answering({ statusCode: 200, body: "{}" })],
    ["the invoke fails", 1, (c) => c.lambdaClient.send.mockRejectedValue(DOWN)],
    ["the email service does not answer in time", 1, (c) => c.lambdaClient.send.mockReturnValue(never())],
    ["the host's address cannot be read", 0, (c) => c.service.cognitoRepository.getUserById.mockRejectedValue(DOWN)],
    ["the host has no email address", 0, (c) => c.service.cognitoRepository.getUserById.mockResolvedValue({})],
    ["the host's messages cannot be counted", 0, (c) => c.eventRepository.countEventsSince.mockRejectedValue(DOWN)],
    ["the site cannot be read", 0, (c) => c.siteRepository.getSiteById.mockRejectedValue(DOWN), 500, "internal_error"],
  ])(
    "answers when %s that it was not sent",
    async (_label, attempts, breakIt, status = 503, code = "message_not_sent") => {
      const contact = buildContact();
      breakIt(contact);
      const response = await contact.send();
      expectRefusal(response, status, code);
      expect(parse(response).error.message).toBe(NOT_SENT);
      expect(contact.lambdaClient.send).toHaveBeenCalledTimes(attempts);
      expect(contact.eventRepository.recordEvent).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["a body that is not JSON", "{not json", "body"],
    ["a body that is not an object", "[1]", "body"],
    ["an empty body", "", "siteId"],
    ["a bad email", JSON.stringify({ ...GUEST, email: "noor@example.nl\r\nBcc: x@example.com" }), "email"],
  ])("answers 400 with the field for %s, before reading any site", async (_label, raw, field) => {
    const { send, siteRepository } = buildContact();
    const response = await send(undefined, raw);
    expectRefusal(response, 400, "invalid_request");
    expect(parse(response).error.field).toBe(field);
    expect(siteRepository.getSiteById).not.toHaveBeenCalled();
  });
});

describe("limiting the messages a host gets", () => {
  it.each([
    ["refuses a message once the host got the limit", MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR, 429, 0],
    ["sends the last message under the limit", MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR - 1, 200, 1],
  ])("%s in the last hour", async (_label, sentLastHour, statusCode, sent) => {
    const { send, eventRepository, emails } = buildContact({ sentLastHour });
    expect((await send()).statusCode).toBe(statusCode);
    expect(emails()).toHaveLength(sent);
    expect(eventRepository.countEventsSince).toHaveBeenCalledWith({
      hostId: HOST,
      eventType: "SITE_CONTACT_MESSAGE_SENT",
      since: NOW - 60 * 60 * 1000,
    });
  });
});
