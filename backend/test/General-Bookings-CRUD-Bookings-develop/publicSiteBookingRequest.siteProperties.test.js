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
    ...propertyHandler,
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
