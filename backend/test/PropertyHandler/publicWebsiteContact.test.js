import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { WebsiteElitePageSettings } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import {
  CONTACT_SENDER_WINDOW_MS,
  MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR,
  MAX_CONTACT_MESSAGES_PER_SENDER,
} from "../../functions/PropertyHandler/business/service/websiteContactService.js";
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
const OWN = "property-own-2";
const FOREIGN = "property-foreign";
const INACTIVE = "property-inactive";
const REMOVED = "property-removed";
const HOST_EMAIL = "amara@example.com";
const NOW = 1782300000000;
const ELITE_SITE = Object.freeze({
  ...EXISTING_SITE,
  publishedContentOverrides: {
    ...EXISTING_SITE.publishedContentOverrides,
    siteProperties: [MAIN, OWN, FOREIGN, INACTIVE, REMOVED].map((propertyId, index) => ({
      propertyId,
      slug: `property-${index}`,
    })),
  },
});
const SNAPSHOTS = [OWN, FOREIGN, INACTIVE, REMOVED].map((propertyId) => ({
  propertyId,
  propertySnapshot: {
    property: { id: propertyId, title: propertyId === OWN ? "Beach\nhouse" : `Title ${propertyId}` },
  },
}));
const STATES = new Map([
  [MAIN, { hostId: HOST, status: "ACTIVE" }],
  [OWN, { hostId: HOST, status: "ACTIVE" }],
  [FOREIGN, { hostId: "host-other", status: "ACTIVE" }],
  [INACTIVE, { hostId: HOST, status: "INACTIVE" }],
]);
const GUEST = Object.freeze({
  siteId: ELITE_SITE.id,
  name: "Noor de Vries",
  email: "noor@example.nl",
  phone: "+31 6 12345678",
  message: 'Is it free in May?\n<b>bold</b> <script>alert("x")</script>',
});

const confirmedAnswer = (command) => {
  const { replyTo } = JSON.parse(command.input.Payload).body;
  const answer = { statusCode: 200, body: JSON.stringify({ message: "Email sent successfully!", replyTo }) };
  return { StatusCode: 200, Payload: new TextEncoder().encode(JSON.stringify(answer)) };
};

const buildContact = ({
  site = ELITE_SITE,
  plan = PAID_ELITE_ROW,
  states = STATES,
  snapshots = SNAPSHOTS,
  sentLastHour = 0,
} = {}) => {
  const ratePlanRepository = buildRatePlanRepository(plan);
  const controller = buildExistingSiteController({ site, ratePlanRepository });
  controller.directBookingWebsiteSiteRepository = {
    getSiteById: jest.fn(async (siteId) => (site?.id === siteId ? site : null)),
    getPublishedSitePropertySnapshots: jest.fn(async () => snapshots),
    getSitePropertyStates: jest.fn(async (ids) =>
      ids.filter((id) => states.has(id)).map((id) => ({ id, ...states.get(id) }))
    ),
  };
  controller.directBookingWebsiteEventRepository = {
    recordEvent: jest.fn(async () => undefined),
    countEventsSince: jest.fn(async () => sentLastHour),
  };
  controller.websiteElitePageSettings = new WebsiteElitePageSettings(controller.directBookingWebsiteRatePlanService, {
    planReadTimeoutMs: 20,
  });
  const lambdaClient = { send: jest.fn(async (command) => confirmedAnswer(command)) };
  const service = controller.getWebsiteContactService();
  service.cognitoRepository = {
    getUserById: jest.fn(async () => ({ Username: HOST, UserAttributes: [{ Name: "email", Value: HOST_EMAIL }] })),
  };
  service.mailer = new EmailNotificationRepository({ lambdaClient });
  service.emailTimeoutMs = 20;
  service.clock = () => NOW;

  const send = (body = GUEST, { sourceIp = "198.51.100.7", raw } = {}) =>
    controller.sendPublicWebsiteContactMessage({
      httpMethod: "POST",
      resource: "/property/website/public/contact",
      body: raw ?? JSON.stringify(body),
      requestContext: { requestId: "req-1", identity: { sourceIp } },
    });
  const emails = () => lambdaClient.send.mock.calls.map(([command]) => JSON.parse(command.input.Payload).body);
  return { controller, service, ratePlanRepository, lambdaClient, send, emails };
};

const parse = (response) => JSON.parse(response.body);
const refusedWith = (response, statusCode, code) => {
  expect(response.statusCode).toBe(statusCode);
  expect(parse(response).error).toMatchObject({ code, requestId: "req-1" });
};

let logged;

beforeEach(() => {
  process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED = "true";
  logged = [
    jest.spyOn(console, "error").mockImplementation(() => {}),
    jest.spyOn(console, "log").mockImplementation(() => {}),
  ];
});

afterEach(() => {
  delete process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED;
  jest.restoreAllMocks();
});

describe("sending a contact message from an Elite website", () => {
  it("emails the site's host with the guest as reply-to and answers SENT", async () => {
    const { send, emails, service } = buildContact();

    const response = await send();

    expect(response.statusCode).toBe(200);
    expect(parse(response)).toEqual({ status: "SENT", requestId: "req-1" });
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(service.cognitoRepository.getUserById).toHaveBeenCalledWith(HOST);
    expect(emails()).toEqual([
      {
        toEmail: HOST_EMAIL,
        replyTo: GUEST.email,
        subject: "New message from your website: Wellness Villa Bisous",
        body: [
          "Hello,",
          "",
          'A guest sent you a message through your website "Wellness Villa Bisous".',
          "",
          "About: no specific property",
          "Name: Noor de Vries",
          "Email: noor@example.nl",
          "Phone: +31 6 12345678",
          "",
          "Message:",
          'Is it free in May?\n<b>bold</b> <script>alert("x")</script>',
          "",
          "Reply to this email to answer the guest.",
        ].join("\n"),
      },
    ]);
  });

  it("takes the recipient, subject and titles from the server, never from the body", async () => {
    const { send, emails } = buildContact();

    await send({
      ...GUEST,
      hostId: "host-other",
      hostEmail: "x@example.com",
      toEmail: "x@example.com",
      subject: "Prize",
      propertyTitle: "Prize",
    });

    expect(emails()[0]).toMatchObject({
      toEmail: HOST_EMAIL,
      subject: "New message from your website: Wellness Villa Bisous",
    });
    expect(emails()[0].body).not.toContain("Prize");
  });

  it("records one sent event without the guest's details, and logs none of them", async () => {
    const { send, controller } = buildContact();

    await send({ ...GUEST, propertyId: OWN });

    expect(controller.directBookingWebsiteEventRepository.recordEvent.mock.calls).toEqual([
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
    for (const detail of [GUEST.name, GUEST.email, GUEST.phone, "free in May"]) {
      expect(output).not.toContain(detail);
    }
  });

  it("names the main property when the guest picks it and it is still the host's and active", async () => {
    const { send, emails } = buildContact();

    expect((await send({ ...GUEST, propertyId: MAIN })).statusCode).toBe(200);

    expect(emails()[0].subject).toBe("New message from your website: Wellness Villa Bisous");
    expect(emails()[0].body).toContain("About: Wellness Villa Bisous\n");
  });

  it("names another property of the site from its published snapshot, on one line", async () => {
    const { send, emails } = buildContact();

    expect((await send({ ...GUEST, propertyId: OWN })).statusCode).toBe(200);

    expect(emails()[0].subject).toBe("New message from your website: Beach house");
    expect(emails()[0].body).toContain("About: Beach house\n");
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
    const { send, controller, emails } = buildContact();
    controller.directBookingWebsiteEventRepository.recordEvent.mockRejectedValue(new Error("event store down"));

    expect((await send()).statusCode).toBe(200);
    expect(emails()).toHaveLength(1);
  });
});

describe("refusing a site that cannot receive messages, as if the route does not exist for it", () => {
  const unknownSiteAnswer = async () => {
    const { send } = buildContact({ site: null });
    return send();
  };

  it.each([
    ["an Essentials site", { plan: ratePlanRow() }],
    ["a site whose host has no plan row", { plan: null }],
    ["an Elite plan that has ended", { plan: { ...PAID_ELITE_ROW, effective_until: new Date(NOW - 1000) } }],
    ["a draft site", { site: { ...ELITE_SITE, status: "DRAFT" } }],
    ["a preview site", { site: { ...ELITE_SITE, status: "PREVIEW" } }],
    ["a suspended site", { site: { ...ELITE_SITE, status: "SUSPENDED" } }],
  ])("answers %s exactly like an unknown site and sends nothing", async (_label, options) => {
    const { send, emails } = buildContact(options);

    const response = await send();

    expect(response).toEqual(await unknownSiteAnswer());
    refusedWith(response, 404, "site_not_found");
    expect(emails()).toHaveLength(0);
  });

  it.each([
    ["fails", (repository) => repository.findCurrentByAccountId.mockRejectedValue(new Error("plan store down"))],
    [
      "does not answer in time",
      (repository) => repository.findCurrentByAccountId.mockReturnValue(new Promise(() => {})),
    ],
  ])("answers 404 and sends nothing when the plan read %s", async (_label, breakPlanRead) => {
    const contact = buildContact();
    breakPlanRead(contact.ratePlanRepository);

    refusedWith(await contact.send(), 404, "site_not_found");
    expect(contact.emails()).toHaveLength(0);
  });

  it("reads nothing and sends nothing while the feature is off", async () => {
    for (const value of [undefined, "false", "TRUE", "1"]) {
      if (value === undefined) delete process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED;
      else process.env.DIRECT_BOOKING_WEBSITE_CONTACT_ENABLED = value;
      const { send, controller, emails } = buildContact();

      const response = await send();

      refusedWith(response, 503, "contact_unavailable");
      expect(parse(response).error.message).toBe(
        "Messages cannot be sent from this website yet. Your message was not sent."
      );
      expect(controller.directBookingWebsiteSiteRepository.getSiteById).not.toHaveBeenCalled();
      expect(emails()).toHaveLength(0);
    }
  });
});

describe("refusing a property that is not served by the site", () => {
  it.each([
    ["of another host", FOREIGN],
    ["that is not active", INACTIVE],
    ["that was removed", REMOVED],
    ["that is not on the site's list", "property-unlisted"],
  ])("answers 404 for a property %s and sends nothing", async (_label, propertyId) => {
    const { send, emails } = buildContact();

    refusedWith(await send({ ...GUEST, propertyId }), 404, "property_not_found");
    expect(emails()).toHaveLength(0);
  });

  it.each([
    ["is no longer active", { hostId: HOST, status: "INACTIVE" }],
    ["now belongs to another host", { hostId: "host-other", status: "ACTIVE" }],
  ])("refuses the main property when it %s", async (_label, mainState) => {
    const { send, emails } = buildContact({ states: new Map([...STATES, [MAIN, mainState]]) });

    refusedWith(await send({ ...GUEST, propertyId: MAIN }), 404, "property_not_found");
    expect(emails()).toHaveLength(0);
  });

  it("refuses a property of the host's other site through a site that does not list it", async () => {
    const site = { ...ELITE_SITE, publishedContentOverrides: EXISTING_SITE.publishedContentOverrides };
    const { send, emails } = buildContact({ site });

    refusedWith(await send({ ...GUEST, propertyId: OWN }), 404, "property_not_found");
    expect(emails()).toHaveLength(0);
  });

  it("refuses another property when its snapshots cannot be read", async () => {
    const contact = buildContact();
    contact.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots.mockRejectedValue(
      new Error("database down")
    );

    refusedWith(await contact.send({ ...GUEST, propertyId: OWN }), 404, "property_not_found");
    expect(contact.emails()).toHaveLength(0);
  });

  it("refuses another property when the plan read for the list fails after the site check", async () => {
    const contact = buildContact();
    contact.ratePlanRepository.findCurrentByAccountId
      .mockResolvedValueOnce(PAID_ELITE_ROW)
      .mockRejectedValueOnce(new Error("plan store down"));

    refusedWith(await contact.send({ ...GUEST, propertyId: OWN }), 404, "property_not_found");
    expect(contact.emails()).toHaveLength(0);
  });
});

describe("telling the guest the message was not sent", () => {
  const notSentAfter = async (breakIt) => {
    const contact = buildContact();
    breakIt(contact);
    const response = await contact.send();
    refusedWith(response, 503, "message_not_sent");
    expect(parse(response).error.message).toBe("Your message could not be sent. Please try again later.");
    return contact;
  };
  const answering = (answer) => async () => ({
    StatusCode: 200,
    Payload: new TextEncoder().encode(JSON.stringify(answer)),
  });

  it.each([
    [
      "the email service answers 500",
      ({ lambdaClient }) => lambdaClient.send.mockImplementation(answering({ statusCode: 500 })),
    ],
    [
      "the email service sends without the reply-to, as it does today",
      ({ lambdaClient }) =>
        lambdaClient.send.mockImplementation(
          answering({ statusCode: 200, body: '{"message":"Email sent successfully!"}' })
        ),
    ],
    ["the invoke fails", ({ lambdaClient }) => lambdaClient.send.mockRejectedValue(new Error("AccessDeniedException"))],
    [
      "the email service does not answer in time",
      ({ lambdaClient }) => lambdaClient.send.mockReturnValue(new Promise(() => {})),
    ],
  ])("answers 503 when %s, and records nothing", async (_label, breakIt) => {
    const { controller } = await notSentAfter(breakIt);

    expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it.each([
    [
      "cannot be read",
      ({ service }) => service.cognitoRepository.getUserById.mockRejectedValue(new Error("Cognito down")),
    ],
    [
      "has no email address",
      ({ service }) => service.cognitoRepository.getUserById.mockResolvedValue({ UserAttributes: [] }),
    ],
  ])("answers 503 and sends nothing when the host's address %s", async (_label, breakIt) => {
    const { emails } = await notSentAfter(breakIt);

    expect(emails()).toHaveLength(0);
  });

  it("answers 503 and sends nothing when the host's recent messages cannot be counted", async () => {
    const { emails } = await notSentAfter(({ controller }) =>
      controller.directBookingWebsiteEventRepository.countEventsSince.mockRejectedValue(new Error("database down"))
    );

    expect(emails()).toHaveLength(0);
  });

  it("answers 500 and sends nothing when the site cannot be read", async () => {
    const { send, controller, emails } = buildContact();
    controller.directBookingWebsiteSiteRepository.getSiteById.mockRejectedValue(new Error("database down"));

    const response = await send();

    refusedWith(response, 500, "internal_error");
    expect(parse(response).error.message).toBe("Your message could not be sent. Please try again later.");
    expect(emails()).toHaveLength(0);
  });

  it.each([
    ["a body that is not JSON", { raw: "{not json" }, "body"],
    ["an empty body", { raw: "" }, "body"],
    ["a bad email", { body: { ...GUEST, email: "noor@example.nl\r\nBcc: x@example.com" } }, "email"],
  ])("answers 400 with the field for %s, before reading any site", async (_label, { raw, body }, field) => {
    const { send, controller } = buildContact();

    const response = await send(body, { raw });

    refusedWith(response, 400, "invalid_request");
    expect(parse(response).error.field).toBe(field);
    expect(controller.directBookingWebsiteSiteRepository.getSiteById).not.toHaveBeenCalled();
  });
});

describe("limiting repeated messages", () => {
  it("refuses a message once the host got the hourly limit, counted over the last hour", async () => {
    const { send, controller, emails } = buildContact({ sentLastHour: MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR });

    refusedWith(await send(), 429, "rate_limited");
    expect(emails()).toHaveLength(0);
    expect(controller.directBookingWebsiteEventRepository.countEventsSince).toHaveBeenCalledWith({
      hostId: HOST,
      eventType: "SITE_CONTACT_MESSAGE_SENT",
      since: NOW - 60 * 60 * 1000,
    });
  });

  it("sends the last message under the hourly limit", async () => {
    const { send } = buildContact({ sentLastHour: MAX_CONTACT_MESSAGES_PER_HOST_PER_HOUR - 1 });

    expect((await send()).statusCode).toBe(200);
  });

  it("refuses a sender after the limit for one site, and lets another sender and a later message through", async () => {
    const contact = buildContact();
    for (let sent = 0; sent < MAX_CONTACT_MESSAGES_PER_SENDER; sent += 1) {
      expect((await contact.send()).statusCode).toBe(200);
    }

    refusedWith(await contact.send(), 429, "rate_limited");
    expect(contact.emails()).toHaveLength(MAX_CONTACT_MESSAGES_PER_SENDER);
    expect((await contact.send(GUEST, { sourceIp: "203.0.113.9" })).statusCode).toBe(200);

    contact.service.clock = () => NOW + CONTACT_SENDER_WINDOW_MS + 1;
    expect((await contact.send()).statusCode).toBe(200);
  });

  it("does not count a message that was not sent against the sender", async () => {
    const contact = buildContact();
    const working = contact.lambdaClient.send.getMockImplementation();
    contact.lambdaClient.send.mockRejectedValue(new Error("SES down"));
    for (let attempt = 0; attempt < MAX_CONTACT_MESSAGES_PER_SENDER; attempt += 1) {
      await contact.send();
    }
    contact.lambdaClient.send.mockImplementation(working);

    expect((await contact.send()).statusCode).toBe(200);
  });
});
