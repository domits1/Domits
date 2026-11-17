import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { WebsiteQuoteService } from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";
import { signWebsiteQuoteToken } from "../../functions/.shared/websiteQuoteToken.js";
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
} from "./support/existingSiteRender.js";

const SECRET = "quote-secret";
const NOW = Date.parse("2026-09-02T10:00:00.000Z");
const HOST = EXISTING_SITE.hostId;
const MAIN = EXISTING_SITE.propertyId;
const OWN = "property-own-2";
const STAY = Object.freeze({ checkIn: "2026-10-01", checkOut: "2026-10-05", guests: 2 });
const LIVE_RATES = Object.freeze({
  [MAIN]: { roomRate: 190, cleaning: 50, minimumStay: 2 },
  [OWN]: { roomRate: 120, cleaning: 30, minimumStay: 3 },
});

const buildQuotePropertyService = (listings) => {
  const ratesOf = (propertyId) => {
    if (propertyId !== MAIN && !listings.has(propertyId)) throw Object.assign(new Error("not found"), { statusCode: 404 });
    return LIVE_RATES[propertyId];
  };
  const listingDetails = (propertyId, location) => ({
    property: { id: propertyId, ...listings.get(propertyId) },
    images: [{ key: `${propertyId}.jpg` }],
    location,
  });
  return {
    getFullPropertyAttributesWithFullLocation: jest.fn(async () => EXISTING_SITE.publishedPropertySnapshot),
    getFullPropertyAttributes: jest.fn(async (propertyId) =>
      listings.has(propertyId) ? listingDetails(propertyId, { city: "Bergen", country: "Norway" }) : null
    ),
    getBasePropertyInfo: jest.fn(async (propertyId) => ({
      id: propertyId,
      status: propertyId === MAIN ? "ACTIVE" : listings.get(propertyId)?.status,
    })),
    getGeneralDetails: jest.fn(async () => [{ detail: "Guests", value: "4" }]),
    getAvailabilityRestrictions: jest.fn(async (propertyId) => [
      { restriction: "MinimumStay", value: String(ratesOf(propertyId).minimumStay) },
    ]),
    getAvailability: jest.fn(async () => [
      { availableStartDate: Date.UTC(2026, 9, 1), availableEndDate: Date.UTC(2026, 9, 31) },
    ]),
    getPricing: jest.fn(async (propertyId) => ({ property_id: propertyId, ...ratesOf(propertyId) })),
    getPublicCalendarAvailability: jest.fn(async () => ({
      externalBlockedDates: [],
      availableDateKeys: [],
      unavailableDateKeys: [],
    })),
  };
};

const buildQuoteFlow = ({ site = null, planRow = PAID_ELITE_ROW } = {}) => {
  const store = { draft: null, site };
  const listings = new Map([[OWN, { hostId: HOST, status: "ACTIVE", title: "Beach house" }]]);
  const ratePlanRepository = buildRatePlanRepository(planRow);
  const controller = buildExistingSiteController({ ratePlanRepository });
  controller.authManager = {
    authorizeGroupRequest: jest.fn(async () => HOST),
    authorizeOwnerRequest: jest.fn(async (_token, propertyId) => {
      if (propertyId !== MAIN && !listings.has(propertyId)) throw new NotFoundException("Property not found.");
      if (propertyId !== MAIN && listings.get(propertyId).hostId !== HOST) throw new Forbidden("Not the owner.");
      return HOST;
    }),
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

  const publishList = async (siteProperties) => {
    await controller.upsertWebsiteDraft(
      hostEvent({
        propertyId: MAIN,
        templateKey: EXISTING_SITE.templateKey,
        status: "PREVIEW",
        contentOverrides: { siteProperties },
        themeOverrides: {},
        publishedContentOverrides: { siteProperties },
        publishedThemeOverrides: {},
      })
    );
    const published = await controller.publishWebsiteSite(hostEvent({ propertyId: MAIN }));
    expect(published.statusCode).toBe(200);
    jest.clearAllMocks();
  };
  const quote = (extra = {}) =>
    controller.createPublicWebsiteQuote({
      httpMethod: "POST",
      resource: "/property/website/public/quote",
      body: JSON.stringify({
        siteId: EXISTING_SITE.id,
        ...STAY,
        currency: "EUR",
        session: { sessionId: "ses-1", source: "standalone_site" },
        ...extra,
      }),
      requestContext: { requestId: "req-1" },
    });
  const recordedEvents = () => controller.directBookingWebsiteEventRepository.recordEvent.mock.calls.map(([input]) => input);
  const quoteReads = () => controller.propertyService.getBasePropertyInfo.mock.calls.map(([propertyId]) => propertyId);

  return { controller, store, listings, ratePlanRepository, publishList, quote, recordedEvents, quoteReads };
};

const expectedQuoteBody = (quoteId, propertyId) => {
  const { roomRate, cleaning, minimumStay } = LIVE_RATES[propertyId];
  const nightlyBaseTotal = roomRate * 100 * 4;
  const priceBreakdown = {
    currency: "EUR",
    nightlyBaseTotal,
    cleaningFee: cleaning * 100,
    discounts: [],
    taxes: [],
    fees: [],
    total: nightlyBaseTotal + cleaning * 100,
  };
  const expiresAt = new Date(NOW + 30 * 60 * 1000).toISOString();
  const quoteToken = signWebsiteQuoteToken(
    { v: 1, quoteId, siteId: EXISTING_SITE.id, propertyId, ...STAY, priceBreakdown, expiresAt },
    SECRET
  );
  return JSON.stringify({
    quoteId,
    siteId: EXISTING_SITE.id,
    propertyId,
    timezone: null,
    checkIn: STAY.checkIn,
    checkOut: STAY.checkOut,
    nights: 4,
    guestCount: 2,
    availability: { isAvailable: true, bookableFrom: "2026-10-01", bookableUntil: "2026-10-31", minimumStay, maximumStay: null },
    priceBreakdown,
    policiesApplied: ["minimum_stay", "availability_window"],
    expiresAt,
    quoteToken,
  });
};

const expectedMainEvents = (quoteId) =>
  [
    {
      draftId: null,
      propertyId: MAIN,
      hostId: HOST,
      eventType: "SITE_QUOTE_REQUESTED",
      payload: { requestId: "req-1", siteId: EXISTING_SITE.id, sessionId: "ses-1", ...STAY },
    },
    {
      draftId: null,
      propertyId: MAIN,
      hostId: HOST,
      eventType: "SITE_QUOTE_RETURNED",
      payload: { requestId: "req-1", siteId: EXISTING_SITE.id, sessionId: "ses-1", quoteId, nights: 4, total: 81000 },
    },
  ].map((event) => JSON.stringify(event));

const expectMainQuoteAsToday = (flow, response, consoleLog) => {
  const { quoteId } = JSON.parse(response.body);
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe(expectedQuoteBody(quoteId, MAIN));
  expect(flow.recordedEvents().map((event) => JSON.stringify(event))).toEqual(expectedMainEvents(quoteId));
  expect(consoleLog.mock.calls).toEqual([
    [
      JSON.stringify({
        scope: "websiteQuote",
        outcome: "returned",
        requestId: "req-1",
        siteId: EXISTING_SITE.id,
        propertyId: MAIN,
        quoteId,
      }),
    ],
  ]);
  expect(flow.quoteReads()).toEqual([MAIN]);
  expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
  expect(flow.controller.directBookingWebsiteSiteRepository.getSitePropertyStates).not.toHaveBeenCalled();
};

let consoleLog;

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(EXISTING_SITE.publishedAt);
  consoleLog = jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("quoting the site's own property", () => {
  it("quotes an existing site without a list exactly as before, without reading the plan or a snapshot", async () => {
    const flow = buildQuoteFlow({ site: EXISTING_SITE });

    const response = await flow.quote();

    expectMainQuoteAsToday(flow, response, consoleLog);
    expectNoPlanRead(flow.ratePlanRepository);
  });

  it.each([
    ["names no property", {}],
    ["names the main property", { propertyId: MAIN }],
    ["names the main property with spaces around it", { propertyId: ` ${MAIN} ` }],
    ["sends a null property", { propertyId: null }],
  ])("quotes the main property of an Elite site with a list as before when the request %s", async (_label, extra) => {
    const flow = buildQuoteFlow();
    await flow.publishList([
      { propertyId: MAIN, slug: "villa" },
      { propertyId: OWN, slug: "beach-house" },
    ]);

    const response = await flow.quote(extra);

    expectMainQuoteAsToday(flow, response, consoleLog);
    expectNoPlanRead(flow.ratePlanRepository);
  });
});
