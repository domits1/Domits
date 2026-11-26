import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import ReservationController from "../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js";
import PublicSiteBookingRequestService from "../../functions/General-Bookings-CRUD-Bookings-develop/business/publicSiteBookingRequestService.js";
import QuoteRevalidationClient from "../../functions/General-Bookings-CRUD-Bookings-develop/business/quoteRevalidationClient.js";
import sendBookingRequestEmails from "../../functions/General-Bookings-CRUD-Bookings-develop/business/sendBookingRequestEmails.js";
import ConflictException from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ConflictException.js";
import { parseBookingDateToMs } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/bookingDateParser.js";
import { WebsiteQuoteService } from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  PAID_ELITE_ROW,
  buildExistingSiteController,
  buildRatePlanRepository,
  buildStoringDraftRepository,
  buildStoringSiteRepository,
  expectNoPlanRead,
  hostEvent,
  ratePlanRow,
} from "../PropertyHandler/support/existingSiteRender.js";

jest.mock("@aws-sdk/credential-provider-node", () => ({
  fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" })),
}));

const SECRET = "quote-secret";
const NOW = Date.parse("2026-09-02T10:00:00.000Z");
const HOST = EXISTING_SITE.hostId;
const SITE_ID = EXISTING_SITE.id;
const MAIN = EXISTING_SITE.propertyId;
const OWN = "property-own-2";
const STAY = Object.freeze({ checkIn: "2026-10-01", checkOut: "2026-10-05", guests: 2 });
const SESSION = Object.freeze({ sessionId: "visitor-1", source: "standalone_site" });
const GUEST = Object.freeze({ name: "Guest Name", email: "guest@example.com" });
const RATES = Object.freeze({ [MAIN]: { roomRate: 190, cleaning: 50 }, [OWN]: { roomRate: 120, cleaning: 30 } });
const TITLES = Object.freeze({ [MAIN]: "Wellness Villa Bisous", [OWN]: "Beach house" });
const POLICIES = Object.freeze({ [MAIN]: "flexible", [OWN]: "strict" });
const LIST = Object.freeze([
  { propertyId: MAIN, slug: "villa" },
  { propertyId: OWN, slug: "beach-house" },
]);
const ARRIVAL_MS = parseBookingDateToMs(STAY.checkIn, "checkIn");
const DEPARTURE_MS = parseBookingDateToMs(STAY.checkOut, "checkOut");

const buildQuotePropertyService = (listings) => ({
  getFullPropertyAttributesWithFullLocation: jest.fn(async () => EXISTING_SITE.publishedPropertySnapshot),
  getFullPropertyAttributes: jest.fn(async (propertyId) =>
    listings.has(propertyId)
      ? {
          property: { id: propertyId, ...listings.get(propertyId) },
          images: [{ key: `${propertyId}.jpg` }],
          location: { city: "Bergen", country: "Norway" },
        }
      : null
  ),
  getBasePropertyInfo: jest.fn(async (propertyId) => ({
    id: propertyId,
    status: propertyId === MAIN ? "ACTIVE" : listings.get(propertyId)?.status,
  })),
  getGeneralDetails: jest.fn(async () => [{ detail: "Guests", value: "4" }]),
  getAvailabilityRestrictions: jest.fn(async () => []),
  getAvailability: jest.fn(async () => [
    { availableStartDate: Date.UTC(2026, 9, 1), availableEndDate: Date.UTC(2026, 9, 31) },
  ]),
  getPricing: jest.fn(async (propertyId) => ({ property_id: propertyId, ...RATES[propertyId] })),
  getPublicCalendarAvailability: jest.fn(async () => ({
    externalBlockedDates: [],
    availableDateKeys: [],
    unavailableDateKeys: [],
  })),
});

const buildPropertyHandler = (store, listings) => {
  const ratePlanRepository = buildRatePlanRepository(PAID_ELITE_ROW);
  const controller = buildExistingSiteController({ ratePlanRepository });
  controller.authManager = {
    authorizeGroupRequest: jest.fn(async () => HOST),
    authorizeOwnerRequest: jest.fn(async () => HOST),
  };
  controller.directBookingWebsiteDraftRepository = buildStoringDraftRepository(store);
  controller.directBookingWebsiteSiteRepository = buildStoringSiteRepository(store, { propertyStates: listings });
  controller.directBookingWebsiteDomainRepository.getFallbackDomainBySiteId = jest.fn(async () => null);
  controller.directBookingWebsiteDomainRepository.ensureDomain = jest.fn(async () => EXISTING_DOMAIN);
  controller.propertyService = buildQuotePropertyService(listings);
  controller.websiteQuoteService = new WebsiteQuoteService({
    propertyService: controller.propertyService,
    quoteTokenSecretProvider: async () => SECRET,
    clock: () => NOW,
  });
  return { controller, ratePlanRepository };
};

const buildBookingSide = (store, quoteController) => {
  const rows = [];
  const blockingBookings = [];
  let refCount = 0;
  const propertyHandlerLambda = {
    send: jest.fn(async (command) => {
      const response = await quoteController.createPublicWebsiteQuote(JSON.parse(command.input.Payload));
      return { Payload: new TextEncoder().encode(JSON.stringify(response)) };
    }),
  };
  const emailLambda = { send: jest.fn(async () => ({})) };
  const eventRepository = { recordEvent: jest.fn(async () => undefined) };
  const reservationRepository = {
    getByIdempotencyKey: jest.fn(async (key) => rows.find((row) => row.idempotency_key === key) ?? null),
    createPublicSiteBookingRequest: jest.fn(async (values) => {
      rows.push(values);
      return values;
    }),
    assertNoBookingConflict: jest.fn(async ({ propertyId, arrivalDateMs, departureDateMs }) => {
      const overlaps = blockingBookings.some(
        (booking) =>
          booking.propertyId === propertyId &&
          booking.arrivalDateMs < departureDateMs &&
          booking.departureDateMs > arrivalDateMs
      );
      if (overlaps) throw new ConflictException("Selected dates are no longer available.");
    }),
  };
  const service = new PublicSiteBookingRequestService({
    standaloneSiteRepository: {
      getSiteById: jest.fn(async (siteId) =>
        store.site?.id === siteId
          ? {
              id: store.site.id,
              propertyId: store.site.propertyId,
              hostId: store.site.hostId,
              status: store.site.status,
            }
          : null
      ),
    },
    reservationRepository,
    propertyRepository: {
      assertBookingDatesAvailable: jest.fn(async () => true),
      getPropertyById: jest.fn(async (propertyId) => ({ hostId: HOST, title: TITLES[propertyId] })),
      getCancellationPolicyByPropertyId: jest.fn(async (propertyId) => POLICIES[propertyId]),
    },
    externalCalendarService: { ensureNoExternalConflict: jest.fn(async () => undefined) },
    quoteRevalidationClient: new QuoteRevalidationClient({
      lambdaClient: propertyHandlerLambda,
      functionName: "PropertyHandler",
    }),
    standaloneSiteEventRepository: eventRepository,
    systemManagerRepository: { getSystemManagerParameter: jest.fn(async () => SECRET) },
    getHostContactById: jest.fn(async () => ({ email: "host@example.com", name: "Amara Host" })),
    sendBookingRequestEmails: (input) => sendBookingRequestEmails(input, { lambdaClient: emailLambda }),
    generatePublicBookingRef: () => `DBW-${String((refCount += 1)).padStart(10, "A")}`,
    clock: () => NOW,
  });
  return {
    controller: new ReservationController({ publicSiteBookingRequestService: service }),
    rows,
    blockingBookings,
    propertyHandlerLambda,
    emailLambda,
    eventRepository,
    reservationRepository,
  };
};

const buildFlow = ({ site = null } = {}) => {
  const store = { draft: null, site };
  const listings = new Map([[OWN, { hostId: HOST, status: "ACTIVE", title: TITLES[OWN] }]]);
  const propertyHandler = buildPropertyHandler(store, listings);
  const booking = buildBookingSide(store, propertyHandler.controller);

  const publish = async (siteProperties) => {
    const contentOverrides = { siteProperties };
    await propertyHandler.controller.upsertWebsiteDraft(
      hostEvent({
        propertyId: MAIN,
        templateKey: EXISTING_SITE.templateKey,
        status: "PREVIEW",
        contentOverrides,
        themeOverrides: {},
        publishedContentOverrides: contentOverrides,
        publishedThemeOverrides: {},
      })
    );
    const published = await propertyHandler.controller.publishWebsiteSite(hostEvent({ propertyId: MAIN }));
    expect(published.statusCode).toBe(200);
    jest.clearAllMocks();
  };
  const quote = async (extra = {}) => {
    const response = await propertyHandler.controller.createPublicWebsiteQuote({
      httpMethod: "POST",
      resource: "/property/website/public/quote",
      body: JSON.stringify({ siteId: SITE_ID, ...STAY, currency: "EUR", session: SESSION, ...extra }),
      requestContext: { requestId: "req-quote" },
    });
    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body);
  };
  const book = (quoteToken, { body = {}, idempotencyKey = "idem-1", siteId = SITE_ID } = {}) =>
    booking.controller.createPublicSiteBookingRequest({
      httpMethod: "POST",
      resource: "/public/sites/{siteId}/bookings",
      path: `/development/public/sites/${siteId}/bookings`,
      pathParameters: { siteId },
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ quoteToken, guest: GUEST, session: SESSION, ...body }),
      requestContext: { requestId: "req-book" },
    });
  const requoteEvents = () =>
    booking.propertyHandlerLambda.send.mock.calls.map(([command]) => [
      command.input.FunctionName,
      command.input.Payload,
    ]);
  const sentEmails = () =>
    booking.emailLambda.send.mock.calls.map(([command]) => [command.input.FunctionName, command.input.Payload]);
  const bookingEvents = () => booking.eventRepository.recordEvent.mock.calls.map(([input]) => JSON.stringify(input));

  return {
    store,
    listings,
    quoteController: propertyHandler.controller,
    ratePlanRepository: propertyHandler.ratePlanRepository,
    ...booking,
    publish,
    quote,
    book,
    requoteEvents,
    sentEmails,
    bookingEvents,
  };
};

const expectedRequoteEvent = (bodyFields) =>
  JSON.stringify({
    httpMethod: "POST",
    resource: "/property/website/public/quote",
    path: "/property/website/public/quote",
    headers: { "Content-Type": "application/json" },
    requestContext: { requestId: "req-book" },
    body: JSON.stringify({ siteId: SITE_ID, ...bodyFields, ...STAY, currency: "EUR", session: SESSION }),
  });

const expectedRow = ({ propertyId, total, publicBookingRef, idempotencyKey = "idem-1" }) =>
  JSON.stringify({
    id: "<id>",
    arrivaldate: ARRIVAL_MS,
    departuredate: DEPARTURE_MS,
    createdat: NOW,
    guestid: "<guestid>",
    guests: 2,
    hostid: HOST,
    latepayment: false,
    paymentid: "FAILED: ",
    property_id: propertyId,
    status: "Inquiry",
    guestname: GUEST.name,
    hostname: "Amara Host",
    total_price: total / 100,
    total_price_minor: String(total),
    cancellation_policy: POLICIES[propertyId],
    bookingtype: "inquiry",
    booking_source: "STANDALONE_SITE",
    site_id: SITE_ID,
    guest_email: GUEST.email,
    public_booking_ref: publicBookingRef,
    idempotency_key: idempotencyKey,
  });

const storedRows = (flow) =>
  flow.rows.map((row) => {
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.guestid).toMatch(/^dbw-[0-9a-f-]{36}$/);
    return JSON.stringify({ ...row, id: "<id>", guestid: "<guestid>" });
  });

const expectedBookingEvent = ({ quoteId, publicBookingRef, payloadFields = {} }) =>
  JSON.stringify({
    propertyId: MAIN,
    hostId: HOST,
    eventType: "SITE_BOOKING_REQUESTED",
    payload: {
      requestId: "req-book",
      siteId: SITE_ID,
      ...payloadFields,
      quoteId,
      publicBookingRef,
      sessionId: SESSION.sessionId,
      ...STAY,
    },
    occurredAt: NOW,
  });

const guestEmailText = ({ propertyName, publicBookingRef }) => `Hello Guest Name,

We have received your booking request for "${propertyName}".

Details:
- Booking reference: ${publicBookingRef}
- Number of guests: 2
- Arrival date: 2026-10-01
- Departure date: 2026-10-05

Your stay is not booked yet. The host still has to confirm your request.

Thank you for your request!`;

const hostEmailText = ({ propertyName, publicBookingRef }) => `Hello,

You have received a new booking request for your property "${propertyName}" through your direct booking website.

Details:
- Booking reference: ${publicBookingRef}
- Guest: Guest Name (guest@example.com)
- Number of guests: 2
- Arrival date: 2026-10-01
- Departure date: 2026-10-05

You can accept or decline this request in your host dashboard.`;

const emailPayload = (toEmail, subject, body) => [
  "EmailNotificationService",
  JSON.stringify({ body: { toEmail, subject, body } }),
];

const expectedEmails = (texts, hostText = hostEmailText(texts)) => [
  emailPayload(GUEST.email, "Booking Request Received", guestEmailText(texts)),
  emailPayload("host@example.com", "New Booking Request", hostText),
];

const expectedAnswer = ({ publicBookingRef, total }) =>
  JSON.stringify({
    publicBookingRef,
    status: "REQUESTED",
    siteId: SITE_ID,
    checkIn: STAY.checkIn,
    checkOut: STAY.checkOut,
    guests: 2,
    total,
    currency: "EUR",
  });

const expectMainBookingAsToday = (flow, response, quoteId) => {
  const publicBookingRef = "DBW-AAAAAAAAA1";
  expect(response.statusCode).toBe(201);
  expect(response.body).toBe(expectedAnswer({ publicBookingRef, total: 81000 }));
  expect(flow.requoteEvents()).toEqual([["PropertyHandler", expectedRequoteEvent({})]]);
  expect(storedRows(flow)).toEqual([expectedRow({ propertyId: MAIN, total: 81000, publicBookingRef })]);
  expect(flow.bookingEvents()).toEqual([expectedBookingEvent({ quoteId, publicBookingRef })]);
  expect(flow.sentEmails()).toEqual(expectedEmails({ propertyName: TITLES[MAIN], publicBookingRef }));
};

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(EXISTING_SITE.publishedAt);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("booking the site's own property", () => {
  it("books the property of an existing site without a list exactly as before", async () => {
    const flow = buildFlow({ site: EXISTING_SITE });
    const { quoteId, quoteToken } = await flow.quote();

    const response = await flow.book(quoteToken);

    expectMainBookingAsToday(flow, response, quoteId);
    expectNoPlanRead(flow.ratePlanRepository);
  });

  it("books the main property of an Elite site with a list exactly as before, without reading the plan", async () => {
    const flow = buildFlow();
    await flow.publish(LIST);
    const { quoteId, quoteToken } = await flow.quote();

    const response = await flow.book(quoteToken);

    expectMainBookingAsToday(flow, response, quoteId);
    expectNoPlanRead(flow.ratePlanRepository);
  });
});

const encodePayload = (response) => ({ Payload: new TextEncoder().encode(JSON.stringify(response)) });
const errorBody = (code, message) => JSON.stringify({ error: { code, message, requestId: "req-book" } });
const LIVE_QUOTE_UNCONFIRMED = "Live pricing and availability could not be confirmed. Please try again.";

const publishedFlow = async () => {
  const flow = buildFlow();
  await flow.publish(LIST);
  return flow;
};

const expectNothingStored = (flow) => {
  expect(flow.rows).toEqual([]);
  expect(flow.sentEmails()).toEqual([]);
  expect(flow.bookingEvents()).toEqual([]);
};

const changedToken = (quoteToken, change) => {
  const [encoded, signature] = quoteToken.slice("qtok_".length).split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return `qtok_${Buffer.from(JSON.stringify({ ...payload, ...change }), "utf8").toString("base64url")}.${signature}`;
};

describe("booking another property of an Elite website", () => {
  it("re-quotes the token's property and books it under that property, its name and its cancellation policy", async () => {
    const flow = await publishedFlow();
    const { quoteId, quoteToken } = await flow.quote({ propertyId: OWN });
    jest.clearAllMocks();

    const response = await flow.book(quoteToken);

    const publicBookingRef = "DBW-AAAAAAAAA1";
    expect(response.statusCode).toBe(201);
    expect(response.body).toBe(expectedAnswer({ publicBookingRef, total: 51000 }));
    expect(flow.requoteEvents()).toEqual([["PropertyHandler", expectedRequoteEvent({ propertyId: OWN })]]);
    expect(flow.ratePlanRepository.findCurrentByAccountId.mock.calls).toEqual([[HOST]]);
    expect(storedRows(flow)).toEqual([expectedRow({ propertyId: OWN, total: 51000, publicBookingRef })]);
    expect(flow.bookingEvents()).toEqual([
      expectedBookingEvent({ quoteId, publicBookingRef, payloadFields: { propertyId: OWN } }),
    ]);
    expect(flow.sentEmails()).toEqual(expectedEmails({ propertyName: TITLES[OWN], publicBookingRef }));
  });

  it("uses the token's property, not a property or a site named in the body", async () => {
    const flow = await publishedFlow();
    const { quoteToken } = await flow.quote({ propertyId: OWN });

    const response = await flow.book(quoteToken, { body: { propertyId: MAIN, siteId: "site-other" } });

    expect(response.statusCode).toBe(201);
    expect(flow.requoteEvents()).toEqual([["PropertyHandler", expectedRequoteEvent({ propertyId: OWN })]]);
    expect(flow.rows.map((row) => [row.site_id, row.property_id])).toEqual([[SITE_ID, OWN]]);
  });

  it.each([
    ["changed to the main property", { change: { propertyId: MAIN } }, 409, "quote_expired"],
    ["changed to another site", { change: { siteId: "site-other" } }, 409, "quote_expired"],
    ["sent to another site's path", { siteId: "site-other" }, 401, "quote_token_invalid"],
  ])("refuses a token of another property %s before the re-quote", async (_label, request, status, code) => {
    const flow = await publishedFlow();
    const { quoteToken } = await flow.quote({ propertyId: OWN });
    const token = request.change ? changedToken(quoteToken, request.change) : quoteToken;

    const response = await flow.book(token, { siteId: request.siteId });

    expect([response.statusCode, JSON.parse(response.body).error.code]).toEqual([status, code]);
    expect(flow.requoteEvents()).toEqual([]);
    expectNothingStored(flow);
  });

  it.each([
    ["is deactivated", (flow) => flow.listings.set(OWN, { ...flow.listings.get(OWN), status: "INACTIVE" })],
    ["moves to another host", (flow) => flow.listings.set(OWN, { ...flow.listings.get(OWN), hostId: "host-other" })],
    ["is removed from the list and the site is published again", (flow) => flow.publish([LIST[0]])],
    [
      "belongs to a host whose Elite ended",
      (flow) => flow.ratePlanRepository.findCurrentByAccountId.mockResolvedValue(ratePlanRow()),
    ],
    [
      "belongs to a host whose plan cannot be read",
      (flow) => flow.ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection reset")),
    ],
  ])(
    "refuses a property that after the quote %s, stores nothing, and still books the main property",
    async (_label, change) => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      const flow = await publishedFlow();
      const { quoteToken } = await flow.quote({ propertyId: OWN });
      await change(flow);

      const response = await flow.book(quoteToken);

      expect(response.statusCode).toBe(404);
      expect(response.body).toBe(
        errorBody("property_not_found", "This property can no longer be booked on this website.")
      );
      expect(flow.requoteEvents()).toEqual([["PropertyHandler", expectedRequoteEvent({ propertyId: OWN })]]);
      expectNothingStored(flow);
      const main = await flow.quote();
      expect((await flow.book(main.quoteToken, { idempotencyKey: "idem-2" })).statusCode).toBe(201);
      expect(flow.rows.map((row) => row.property_id)).toEqual([MAIN]);
    }
  );

  it("refuses a re-quote that answers for the main property, before it compares the price", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = await publishedFlow();
    const { quoteToken } = await flow.quote({ propertyId: OWN });
    flow.propertyHandlerLambda.send.mockImplementationOnce(async (command) => {
      const event = JSON.parse(command.input.Payload);
      const { propertyId, ...bodyWithoutProperty } = JSON.parse(event.body);
      return encodePayload(
        await flow.quoteController.createPublicWebsiteQuote({ ...event, body: JSON.stringify(bodyWithoutProperty) })
      );
    });

    const response = await flow.book(quoteToken);

    expect(response.statusCode).toBe(503);
    expect(response.body).toBe(errorBody("booking_service_unavailable", LIVE_QUOTE_UNCONFIRMED));
    expect(consoleError).toHaveBeenCalledWith("Quote revalidation answered for another property.", {
      siteId: SITE_ID,
      requestId: "req-book",
    });
    expectNothingStored(flow);
  });

  it.each([
    ["the invoke fails", () => Promise.reject(Object.assign(new Error("socket hang up"), { name: "TimeoutError" }))],
    [
      "the quote Lambda times out",
      async () => ({
        FunctionError: "Unhandled",
        ...encodePayload({ errorType: "Sandbox.Timedout", errorMessage: "Task timed out after 30.00 seconds" }),
      }),
    ],
  ])("asks the guest to try again and stores nothing when %s", async (_label, answer) => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = await publishedFlow();
    const { quoteToken } = await flow.quote({ propertyId: OWN });
    flow.propertyHandlerLambda.send.mockImplementationOnce(answer);

    const response = await flow.book(quoteToken);

    expect(response.statusCode).toBe(503);
    expect(response.body).toBe(errorBody("booking_service_unavailable", LIVE_QUOTE_UNCONFIRMED));
    expectNothingStored(flow);
  });

  it("stores two requests of two guests for the same property and dates, each under that property", async () => {
    const flow = await publishedFlow();
    const first = await flow.quote({ propertyId: OWN });
    const second = await flow.quote({ propertyId: OWN });

    const responses = await Promise.all([
      flow.book(first.quoteToken, { idempotencyKey: "idem-1" }),
      flow.book(second.quoteToken, { idempotencyKey: "idem-2" }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([201, 201]);
    expect(flow.rows.map((row) => [row.property_id, row.status, row.idempotency_key]).sort()).toEqual([
      [OWN, "Inquiry", "idem-1"],
      [OWN, "Inquiry", "idem-2"],
    ]);
    expect(flow.reservationRepository.assertNoBookingConflict.mock.calls).toEqual([
      [{ propertyId: OWN, arrivalDateMs: ARRIVAL_MS, departureDateMs: DEPARTURE_MS }],
      [{ propertyId: OWN, arrivalDateMs: ARRIVAL_MS, departureDateMs: DEPARTURE_MS }],
    ]);
  });

  it("refuses dates taken on that property, not dates taken on the main property", async () => {
    const flow = await publishedFlow();
    const taken = { arrivalDateMs: ARRIVAL_MS, departureDateMs: DEPARTURE_MS };
    flow.blockingBookings.push({ propertyId: MAIN, ...taken });
    const free = await flow.quote({ propertyId: OWN });
    expect((await flow.book(free.quoteToken, { idempotencyKey: "idem-1" })).statusCode).toBe(201);

    flow.blockingBookings.push({ propertyId: OWN, ...taken });
    const blocked = await flow.quote({ propertyId: OWN });
    const response = await flow.book(blocked.quoteToken, { idempotencyKey: "idem-2" });

    expect(response.statusCode).toBe(409);
    expect(response.body).toBe(errorBody("unavailable_dates", "The selected dates are no longer available."));
    expect(flow.rows.map((row) => row.idempotency_key)).toEqual(["idem-1"]);
  });
});
