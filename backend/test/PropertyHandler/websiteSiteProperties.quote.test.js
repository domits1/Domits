import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { WebsiteQuoteService } from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";
import { WEBSITE_QUOTE_BATCH_ENTRY_TIMEOUT_MS } from "../../functions/PropertyHandler/controller/propertyController.js";
import { WEBSITE_PLAN_READ_TIMEOUT_MS } from "../../functions/PropertyHandler/business/service/websiteElitePageSettings.js";
import { SITE_PROPERTY_READ_TIMEOUT_MS } from "../../functions/PropertyHandler/business/service/websiteSitePropertySnapshots.js";
import { signWebsiteQuoteToken, verifyWebsiteQuoteToken } from "../../functions/.shared/websiteQuoteToken.js";
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
} from "./support/existingSiteRender.js";

const SECRET = "quote-secret";
const NOW = Date.parse("2026-09-02T10:00:00.000Z");
const HOST = EXISTING_SITE.hostId;
const MAIN = EXISTING_SITE.propertyId;
const OWN = "property-own-2";
const CABIN = "property-own-3";
const FOREIGN = "property-foreign";
const STAY = Object.freeze({ checkIn: "2026-10-01", checkOut: "2026-10-05", guests: 2 });
const LIVE_RATES = Object.freeze({
  [MAIN]: { roomRate: 190, cleaning: 50, minimumStay: 2 },
  [OWN]: { roomRate: 120, cleaning: 30, minimumStay: 3 },
  [CABIN]: { roomRate: 150, cleaning: 40, minimumStay: 2 },
});

const buildQuotePropertyService = (listings, blockedNights) => {
  const ratesOf = (propertyId) => {
    if (propertyId !== MAIN && !listings.has(propertyId)) {
      throw Object.assign(new Error("not found"), { statusCode: 404 });
    }
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
    getPublicCalendarAvailability: jest.fn(async (propertyId) => ({
      externalBlockedDates: [],
      availableDateKeys: [],
      unavailableDateKeys: blockedNights.get(propertyId) ?? [],
    })),
  };
};

const buildQuoteFlow = ({ site = null, planRow = PAID_ELITE_ROW } = {}) => {
  const store = { draft: null, site };
  const listings = new Map([
    [OWN, { hostId: HOST, status: "ACTIVE", title: "Beach house" }],
    [CABIN, { hostId: HOST, status: "ACTIVE", title: "Forest cabin" }],
    [FOREIGN, { hostId: "host-other", status: "ACTIVE", title: "Not this host's" }],
  ]);
  const blockedNights = new Map();
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
  controller.propertyService = buildQuotePropertyService(listings, blockedNights);
  controller.websiteQuoteService = new WebsiteQuoteService({
    propertyService: controller.propertyService,
    quoteTokenSecretProvider: async () => SECRET,
    clock: () => NOW,
  });

  const saveList = (siteProperties) =>
    controller.upsertWebsiteDraft(
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
  const publishList = async (siteProperties) => {
    await saveList(siteProperties);
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
  const recordedEvents = () =>
    controller.directBookingWebsiteEventRepository.recordEvent.mock.calls.map(([input]) => input);
  const quoteReads = () => controller.propertyService.getBasePropertyInfo.mock.calls.map(([propertyId]) => propertyId);

  return {
    controller,
    store,
    listings,
    blockedNights,
    ratePlanRepository,
    saveList,
    publishList,
    quote,
    recordedEvents,
    quoteReads,
  };
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
    availability: {
      isAvailable: true,
      bookableFrom: "2026-10-01",
      bookableUntil: "2026-10-31",
      minimumStay,
      maximumStay: null,
    },
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

const LIST = Object.freeze([
  { propertyId: MAIN, slug: "villa" },
  { propertyId: OWN, slug: "beach-house" },
]);
const LIST_OF_THREE = Object.freeze([...LIST, { propertyId: CABIN, slug: "forest-cabin" }]);
const NOT_FOUND = Object.freeze({
  error: { code: "property_not_found", message: "No property was found for this website.", requestId: "req-1" },
});
const QUOTE_READS = Object.freeze([
  "getBasePropertyInfo",
  "getGeneralDetails",
  "getAvailabilityRestrictions",
  "getAvailability",
  "getPricing",
  "getPublicCalendarAvailability",
]);

const publishedFlow = async (options) => {
  const flow = buildQuoteFlow(options);
  await flow.publishList(LIST);
  return flow;
};

const expectRefused = (flow, response) => {
  expect(response.statusCode).toBe(404);
  expect(JSON.parse(response.body)).toEqual(NOT_FOUND);
  expect(flow.quoteReads()).toEqual([]);
  expect(flow.recordedEvents()).toEqual([]);
};

const expectMainStillQuotes = async (flow) => {
  const main = await flow.quote();
  expect(main.body).toBe(expectedQuoteBody(JSON.parse(main.body).quoteId, MAIN));
};

describe("quoting another property of an Elite website", () => {
  it("quotes a listed property from its own live data and binds the token to the site and that property", async () => {
    const flow = await publishedFlow();

    const response = await flow.quote({ propertyId: OWN });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(expectedQuoteBody(body.quoteId, OWN));
    expect(verifyWebsiteQuoteToken(body.quoteToken, SECRET, { now: NOW })).toMatchObject({
      siteId: EXISTING_SITE.id,
      propertyId: OWN,
      priceBreakdown: { total: 51000 },
    });
    expect(flow.ratePlanRepository.findCurrentByAccountId.mock.calls).toEqual([[HOST]]);
    expect(QUOTE_READS.flatMap((name) => flow.controller.propertyService[name].mock.calls)).toEqual(
      QUOTE_READS.map(() => [OWN])
    );
    expect(flow.recordedEvents()).toEqual([
      expect.objectContaining({
        propertyId: MAIN,
        hostId: HOST,
        eventType: "SITE_QUOTE_REQUESTED",
        payload: expect.objectContaining({ siteId: EXISTING_SITE.id, propertyId: OWN }),
      }),
      expect.objectContaining({
        eventType: "SITE_QUOTE_RETURNED",
        payload: expect.objectContaining({ propertyId: OWN, quoteId: body.quoteId, total: 51000 }),
      }),
    ]);
    expect(consoleLog.mock.calls.map(([line]) => JSON.parse(line))).toEqual([
      expect.objectContaining({ outcome: "returned", propertyId: OWN, quoteId: body.quoteId }),
    ]);
  });

  it("refuses dates by the listed property's own calendar and minimum stay, where the main property could take them", async () => {
    const flow = await publishedFlow();
    flow.blockedNights.set(OWN, ["2026-10-02"]);
    const shortStay = { checkIn: "2026-10-10", checkOut: "2026-10-12" };

    const blocked = await flow.quote({ propertyId: OWN });
    const tooShort = await flow.quote({ propertyId: OWN, ...shortStay });
    const main = await flow.quote(shortStay);

    expect([blocked.statusCode, JSON.parse(blocked.body).error.code]).toEqual([409, "unavailable_dates"]);
    expect([tooShort.statusCode, JSON.parse(tooShort.body).error.code]).toEqual([409, "stay_restriction_violation"]);
    expect(main.statusCode).toBe(200);
    const conflicts = flow.recordedEvents().filter(({ eventType }) => eventType === "SITE_QUOTE_CONFLICTED");
    expect(conflicts.map(({ propertyId, payload }) => [propertyId, payload.propertyId, payload.code])).toEqual([
      [MAIN, OWN, "unavailable_dates"],
      [MAIN, OWN, "stay_restriction_violation"],
    ]);
    expect(consoleLog.mock.calls.map(([line]) => JSON.parse(line).propertyId)).toEqual([OWN, OWN, MAIN]);
  });

  it.each([
    ["a property of another host", FOREIGN],
    ["a property of the host that is not listed", CABIN],
    ["the id of a website", "site-other"],
    ["an id that exists nowhere", "property-nowhere"],
    ["a very long id", "p".repeat(100_000)],
    ["the main property id in other letters", MAIN.toUpperCase()],
  ])("refuses %s without reading the plan, a snapshot or the property", async (_label, propertyId) => {
    const flow = await publishedFlow();

    const response = await flow.quote({ propertyId });

    expectRefused(flow, response);
    expectNoPlanRead(flow.ratePlanRepository);
    expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
    expect(flow.controller.directBookingWebsiteSiteRepository.getSitePropertyStates).not.toHaveBeenCalled();
  });

  it("refuses a property that is only in the draft list, and quotes it once the site is published with it", async () => {
    const flow = await publishedFlow();
    await flow.saveList(LIST_OF_THREE);
    jest.clearAllMocks();

    expectRefused(flow, await flow.quote({ propertyId: CABIN }));

    await flow.publishList(LIST_OF_THREE);
    const published = await flow.quote({ propertyId: CABIN });
    expect(published.body).toBe(expectedQuoteBody(JSON.parse(published.body).quoteId, CABIN));
  });

  it.each([
    ["is deactivated", (flow) => flow.listings.set(OWN, { ...flow.listings.get(OWN), status: "INACTIVE" })],
    ["moves to another host", (flow) => flow.listings.set(OWN, { ...flow.listings.get(OWN), hostId: "host-other" })],
    ["is deleted", (flow) => flow.listings.delete(OWN)],
    [
      "has no published snapshot",
      (flow) => {
        flow.store.sitePropertySnapshots = flow.store.sitePropertySnapshots.filter(
          ({ propertyId }) => propertyId !== OWN
        );
      },
    ],
    [
      "is removed from the list and the site is published again",
      (flow) => flow.publishList([LIST[0], LIST_OF_THREE[2]]),
    ],
  ])("stops quoting a listed property that after publish %s, and still quotes the others", async (_label, change) => {
    const flow = buildQuoteFlow();
    await flow.publishList(LIST_OF_THREE);
    await change(flow);

    expectRefused(flow, await flow.quote({ propertyId: OWN }));
    const cabin = await flow.quote({ propertyId: CABIN });
    expect(cabin.body).toBe(expectedQuoteBody(JSON.parse(cabin.body).quoteId, CABIN));
    await expectMainStillQuotes(flow);
  });

  it("stops quoting the other properties when the host's Elite ends after publish, and still quotes the main property", async () => {
    const flow = buildQuoteFlow();
    await flow.publishList(LIST_OF_THREE);
    flow.ratePlanRepository.findCurrentByAccountId.mockResolvedValue(ratePlanRow());

    expectRefused(flow, await flow.quote({ propertyId: OWN }));
    expectRefused(flow, await flow.quote({ propertyId: CABIN }));
    await expectMainStillQuotes(flow);
  });

  it("refuses a listed property when the site is published again between reading the site and its snapshots", async () => {
    const flow = await publishedFlow();
    const siteBeforeRepublish = flow.store.site;
    await flow.publishList(LIST);
    flow.controller.directBookingWebsiteSiteRepository.getSiteById.mockResolvedValueOnce(siteBeforeRepublish);

    expectRefused(flow, await flow.quote({ propertyId: OWN }));
    expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).toHaveBeenCalledWith(
      EXISTING_SITE.id,
      siteBeforeRepublish.staticPageRevision
    );
    const afterRepublish = await flow.quote({ propertyId: OWN });
    expect(afterRepublish.body).toBe(expectedQuoteBody(JSON.parse(afterRepublish.body).quoteId, OWN));
  });

  it("lists only the other properties the site serves, never the main property", async () => {
    const flow = buildQuoteFlow();
    await flow.publishList(LIST_OF_THREE);
    flow.listings.set(CABIN, { ...flow.listings.get(CABIN), status: "INACTIVE" });

    const served = await flow.controller
      .getWebsiteSitePropertySnapshots()
      .listServedOtherPropertyIds({ site: flow.store.site, propertyIds: [MAIN, CABIN] });

    expect(served).toEqual(new Set([OWN]));
  });

  it.each([
    ["the plan read", (flow) => flow.ratePlanRepository.findCurrentByAccountId],
    [
      "the snapshot read",
      (flow) => flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots,
    ],
  ])("refuses a listed property when %s fails, and logs it", async (_label, read) => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = await publishedFlow();
    read(flow).mockRejectedValue(new Error("connection timed out"));

    expectRefused(flow, await flow.quote({ propertyId: OWN }));
    expect(consoleError).toHaveBeenCalledTimes(1);
    await expectMainStillQuotes(flow);
  });

  it.each([
    ["the plan read", (flow) => flow.ratePlanRepository.findCurrentByAccountId, WEBSITE_PLAN_READ_TIMEOUT_MS],
    [
      "the snapshot read",
      (flow) => flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots,
      SITE_PROPERTY_READ_TIMEOUT_MS,
    ],
  ])("refuses a listed property when %s does not answer in time", async (_label, read, limitMs) => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = await publishedFlow();
    read(flow).mockReturnValue(new Promise(() => undefined));
    jest.useFakeTimers();

    const pending = flow.quote({ propertyId: OWN });
    await jest.advanceTimersByTimeAsync(limitMs);

    expectRefused(flow, await pending);
  });

  it.each([
    ["an empty string", ""],
    ["only spaces", "   "],
    ["a number", 42],
    ["an array", [OWN]],
    ["an object", { propertyId: OWN }],
    ["a boolean", true],
  ])("answers 400 for a propertyId that is %s, before reading the site", async (_label, propertyId) => {
    const flow = await publishedFlow();

    const response = await flow.quote({ propertyId });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: "invalid_request", message: "propertyId must be a non-empty string.", requestId: "req-1" },
    });
    expect(flow.controller.directBookingWebsiteSiteRepository.getSiteById).not.toHaveBeenCalled();
  });

  it("signs the token so that it cannot be changed to another property of the site", async () => {
    const flow = await publishedFlow();
    const { quoteToken } = JSON.parse((await flow.quote({ propertyId: OWN })).body);
    const [encodedPayload, signature] = quoteToken.slice("qtok_".length).split(".");
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const changed = Buffer.from(JSON.stringify({ ...payload, propertyId: MAIN }), "utf8").toString("base64url");

    expect(payload).toMatchObject({ siteId: EXISTING_SITE.id, propertyId: OWN });
    expect(verifyWebsiteQuoteToken(`qtok_${changed}.${signature}`, SECRET, { now: NOW })).toBeNull();
  });
});

const BATCH_NOT_FOUND = Object.freeze({
  code: "property_not_found",
  message: "No property was found for this website.",
});
const entriesOf = (response) => JSON.parse(response.body).quotes;
const outcomesOf = (response) =>
  entriesOf(response).map(({ propertyId, error }) => [propertyId, error?.code ?? "quoted"]);
const expectQuoted = (entry, propertyId) =>
  expect(JSON.stringify(entry.quote)).toBe(expectedQuoteBody(entry.quote.quoteId, propertyId));
const publishedThree = async () => {
  const flow = buildQuoteFlow();
  await flow.publishList(LIST_OF_THREE);
  return flow;
};
const replaceRead = (flow, name, replace) => {
  const read = flow.controller.propertyService[name].getMockImplementation();
  flow.controller.propertyService[name].mockImplementation((propertyId) => replace(propertyId, read));
};

describe("quoting several properties of a website in one request", () => {
  it("quotes the main property inside a batch exactly as a single quote, on a site without a list", async () => {
    const flow = buildQuoteFlow({ site: EXISTING_SITE });

    const response = await flow.quote({ propertyIds: [MAIN, "property-nowhere"] });

    const { quoteId } = entriesOf(response)[0].quote;
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(
      JSON.stringify({
        siteId: EXISTING_SITE.id,
        quotes: [
          { propertyId: MAIN, quote: JSON.parse(expectedQuoteBody(quoteId, MAIN)) },
          { propertyId: "property-nowhere", error: BATCH_NOT_FOUND },
        ],
      })
    );
    expect(flow.recordedEvents().map((event) => JSON.stringify(event))).toEqual(expectedMainEvents(quoteId));
    expect(consoleLog.mock.calls.map(([line]) => JSON.parse(line))).toEqual([
      {
        scope: "websiteQuote",
        outcome: "returned",
        requestId: "req-1",
        siteId: EXISTING_SITE.id,
        propertyId: MAIN,
        quoteId,
      },
    ]);
    expectNoPlanRead(flow.ratePlanRepository);
    expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
  });

  it("quotes a batch of only the main property of an Elite site without reading the plan or a snapshot", async () => {
    const flow = await publishedThree();

    const response = await flow.quote({ propertyIds: [MAIN] });

    expectQuoted(entriesOf(response)[0], MAIN);
    expectNoPlanRead(flow.ratePlanRepository);
    expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
  });

  it("quotes each served property in the order asked, reading the plan and the snapshots once", async () => {
    const flow = await publishedThree();

    const response = await flow.quote({ propertyIds: [CABIN, ` ${MAIN} `, OWN, FOREIGN] });

    const entries = entriesOf(response);
    expect(outcomesOf(response)).toEqual([
      [CABIN, "quoted"],
      [MAIN, "quoted"],
      [OWN, "quoted"],
      [FOREIGN, "property_not_found"],
    ]);
    [CABIN, MAIN, OWN].forEach((propertyId, index) => expectQuoted(entries[index], propertyId));
    expect(flow.ratePlanRepository.findCurrentByAccountId.mock.calls).toEqual([[HOST]]);
    expect(flow.controller.directBookingWebsiteSiteRepository.getPublishedSitePropertySnapshots).toHaveBeenCalledTimes(
      1
    );
    expect(flow.controller.directBookingWebsiteSiteRepository.getSitePropertyStates).toHaveBeenCalledTimes(1);
  });

  it("answers each property on its own when one is unavailable and one does not finish in time", async () => {
    const flow = await publishedThree();
    flow.blockedNights.set(OWN, ["2026-10-02"]);
    replaceRead(flow, "getPricing", (propertyId, read) =>
      propertyId === CABIN ? new Promise(() => undefined) : read(propertyId)
    );
    jest.useFakeTimers();

    const pending = flow.quote({ propertyIds: [MAIN, OWN, CABIN] });
    await jest.advanceTimersByTimeAsync(WEBSITE_QUOTE_BATCH_ENTRY_TIMEOUT_MS);
    const response = await pending;

    expect(outcomesOf(response)).toEqual([
      [MAIN, "quoted"],
      [OWN, "unavailable_dates"],
      [CABIN, "pricing_service_unavailable"],
    ]);
    const failureLogs = consoleLog.mock.calls
      .map(([line]) => JSON.parse(line))
      .filter(({ outcome }) => outcome !== "returned");
    expect(failureLogs).toEqual([
      {
        scope: "websiteQuote",
        outcome: "unavailable_dates",
        requestId: "req-1",
        siteId: EXISTING_SITE.id,
        propertyId: OWN,
      },
      {
        scope: "websiteQuote",
        outcome: "pricing_service_unavailable",
        requestId: "req-1",
        siteId: EXISTING_SITE.id,
        propertyId: CABIN,
      },
    ]);
    const conflicts = flow.recordedEvents().filter(({ eventType }) => eventType === "SITE_QUOTE_CONFLICTED");
    expect(conflicts.map(({ payload }) => [payload.propertyId, payload.code])).toEqual([[OWN, "unavailable_dates"]]);
  });

  it("refuses the other properties and still quotes the main one when the plan cannot be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = await publishedThree();
    flow.ratePlanRepository.findCurrentByAccountId.mockRejectedValue(new Error("connection timed out"));

    const response = await flow.quote({ propertyIds: [OWN, MAIN, CABIN] });

    expect(outcomesOf(response)).toEqual([
      [OWN, "property_not_found"],
      [MAIN, "quoted"],
      [CABIN, "property_not_found"],
    ]);
    expect(flow.ratePlanRepository.findCurrentByAccountId).toHaveBeenCalledTimes(1);
  });

  it("answers internal_error for a property whose quote fails unexpectedly, and logs it", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const flow = buildQuoteFlow({ site: EXISTING_SITE });
    flow.controller.websiteQuoteService.quoteTokenSecretProvider = async () => {
      throw new Error("parameter store unavailable");
    };

    const response = await flow.quote({ propertyIds: [MAIN] });

    expect(response.statusCode).toBe(200);
    expect(entriesOf(response)).toEqual([
      {
        propertyId: MAIN,
        error: { code: "internal_error", message: "We could not complete this quote request. Please try again." },
      },
    ]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("quotes at most four properties at the same time", async () => {
    const flow = buildQuoteFlow();
    const more = ["property-own-4", "property-own-5", "property-own-6"];
    more.forEach((propertyId) => flow.listings.set(propertyId, { hostId: HOST, status: "ACTIVE", title: propertyId }));
    await flow.publishList([...LIST_OF_THREE, ...more.map((propertyId) => ({ propertyId, slug: propertyId }))]);
    let running = 0;
    let mostAtOnce = 0;
    replaceRead(flow, "getBasePropertyInfo", async (propertyId, read) => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => setImmediate(resolve));
      running -= 1;
      return read(propertyId);
    });

    const response = await flow.quote({ propertyIds: [MAIN, OWN, CABIN, ...more] });

    expect(entriesOf(response)).toHaveLength(6);
    expect(mostAtOnce).toBe(4);
  });

  it.each([
    ["not a list", { propertyIds: OWN }],
    ["an empty list", { propertyIds: [] }],
    ["more than 12 ids", { propertyIds: Array.from({ length: 13 }, (_, index) => `property-${index}`) }],
    ["the same id twice", { propertyIds: [OWN, ` ${OWN} `] }],
    ["an empty id", { propertyIds: [MAIN, " "] }],
    ["an id that is not a string", { propertyIds: [MAIN, 7] }],
    ["sent with propertyId", { propertyId: MAIN, propertyIds: [MAIN] }],
  ])("answers 400 for propertyIds that is %s, before reading the site", async (_label, extra) => {
    const flow = await publishedFlow();

    const response = await flow.quote(extra);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: "invalid_request",
        message: "propertyIds must list 1 to 12 different property ids, without propertyId.",
        requestId: "req-1",
      },
    });
    expect(flow.controller.directBookingWebsiteSiteRepository.getSiteById).not.toHaveBeenCalled();
  });
});
