import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import {
  WebsiteQuoteError,
  WEBSITE_QUOTE_ERROR_CODES,
} from "../../functions/PropertyHandler/util/exception/WebsiteQuoteError.js";

const PUBLISHED_SITE = {
  id: "site-1",
  propertyId: "property-1",
  hostId: "host-1",
  status: "PUBLISHED",
  templateKey: "panorama-landing",
};

const QUOTE_FIXTURE = {
  quoteId: "quote_test",
  siteId: "site-1",
  propertyId: "property-1",
  nights: 4,
  guestCount: 2,
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 76000, cleaningFee: 5000, total: 81000 },
  expiresAt: "2026-09-02T12:30:00.000Z",
  quoteToken: "qtok_test",
};

// Carries a client propertyId on purpose: the controller must never forward it.
const REQUEST_BODY = {
  siteId: "site-1",
  propertyId: "attacker-property",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  currency: "EUR",
  session: { sessionId: "ses-1" },
};

const buildQuoteEvent = ({ body = REQUEST_BODY, requestContext = { requestId: "req-1" } } = {}) => ({
  httpMethod: "POST",
  resource: "/property/website/public/quote",
  body: typeof body === "string" ? body : JSON.stringify(body),
  requestContext,
});

const buildQuoteController = ({ site = PUBLISHED_SITE, quote = QUOTE_FIXTURE, createQuoteError = null, recordEventError = null } = {}) => {
  const controller = new PropertyController();
  controller.directBookingWebsiteSiteRepository = { getSiteById: jest.fn().mockResolvedValue(site) };
  controller.directBookingWebsiteEventRepository = {
    recordEvent: recordEventError
      ? jest.fn().mockRejectedValue(recordEventError)
      : jest.fn().mockResolvedValue(undefined),
  };
  controller.websiteQuoteService = createQuoteError
    ? { createQuote: jest.fn().mockRejectedValue(createQuoteError) }
    : { createQuote: jest.fn().mockResolvedValue(quote) };
  return controller;
};

const parseBody = (response) => JSON.parse(response.body);

describe("PropertyController.createPublicWebsiteQuote", () => {
  it("returns the quote with no-store headers for a published site", async () => {
    const controller = buildQuoteController();

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(QUOTE_FIXTURE);
    expect(response.headers["Cache-Control"]).toContain("no-store");
  });

  it("quotes the site's own property and ignores the client-supplied propertyId", async () => {
    const controller = buildQuoteController();

    await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(controller.websiteQuoteService.createQuote).toHaveBeenCalledWith({
      siteId: "site-1",
      propertyId: "property-1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      guests: 2,
      currency: "EUR",
    });
  });

  it("records a requested and a returned event, attributed to the site owner", async () => {
    const controller = buildQuoteController();

    await controller.createPublicWebsiteQuote(buildQuoteEvent());

    const recorded = controller.directBookingWebsiteEventRepository.recordEvent.mock.calls.map(([input]) => input);
    expect(recorded).toHaveLength(2);
    expect(recorded[0]).toMatchObject({
      propertyId: "property-1",
      hostId: "host-1",
      eventType: "SITE_QUOTE_REQUESTED",
      payload: { requestId: "req-1", siteId: "site-1", sessionId: "ses-1" },
    });
    expect(recorded[1]).toMatchObject({
      eventType: "SITE_QUOTE_RETURNED",
      payload: { requestId: "req-1", quoteId: "quote_test" },
    });
  });

  it("still returns the quote when event recording fails", async () => {
    const controller = buildQuoteController({ recordEventError: new Error("event store down") });

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(QUOTE_FIXTURE);
  });

  it.each([
    ["a malformed JSON body", "{not json"],
    ["a non-object body", JSON.stringify("just-a-string")],
    ["a body without siteId", JSON.stringify({ checkIn: "2026-10-01" })],
  ])("rejects %s as 400 invalid_request before resolving any site", async (_label, body) => {
    const controller = buildQuoteController();

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent({ body }));

    expect(response.statusCode).toBe(400);
    expect(parseBody(response).error).toMatchObject({ code: "invalid_request", requestId: "req-1" });
    expect(controller.directBookingWebsiteSiteRepository.getSiteById).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown site", null, 404, "site_not_found"],
    ["a suspended site", { ...PUBLISHED_SITE, status: "SUSPENDED" }, 410, "site_suspended"],
    ["a preview site", { ...PUBLISHED_SITE, status: "PREVIEW" }, 409, "site_not_published"],
    ["a draft site", { ...PUBLISHED_SITE, status: "DRAFT" }, 409, "site_not_published"],
  ])("rejects %s without quoting or recording events", async (_label, site, expectedStatus, expectedCode) => {
    const controller = buildQuoteController({ site });

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(response.statusCode).toBe(expectedStatus);
    expect(parseBody(response).error).toMatchObject({ code: expectedCode, requestId: "req-1" });
    expect(controller.websiteQuoteService.createQuote).not.toHaveBeenCalled();
    expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it.each([
    [WEBSITE_QUOTE_ERROR_CODES.INVALID_DATE_RANGE, 400, false],
    [WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT, 400, false],
    [WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES, 409, true],
    [WEBSITE_QUOTE_ERROR_CODES.STAY_RESTRICTION_VIOLATION, 409, true],
    [WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE, 422, false],
    [WEBSITE_QUOTE_ERROR_CODES.PRICING_SERVICE_UNAVAILABLE, 503, false],
  ])("maps a %s quote error to %i and records a conflict event only for conflicts", async (code, expectedStatus, expectsConflictEvent) => {
    const controller = buildQuoteController({ createQuoteError: new WebsiteQuoteError(code, "Quote failed for the test.") });

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(response.statusCode).toBe(expectedStatus);
    expect(parseBody(response).error).toMatchObject({
      code,
      message: "Quote failed for the test.",
      requestId: "req-1",
    });

    const recorded = controller.directBookingWebsiteEventRepository.recordEvent.mock.calls.map(([input]) => input);
    const conflictEvents = recorded.filter((input) => input.eventType === "SITE_QUOTE_CONFLICTED");
    if (expectsConflictEvent) {
      expect(conflictEvents).toHaveLength(1);
      expect(conflictEvents[0]).toMatchObject({
        propertyId: "property-1",
        hostId: "host-1",
        payload: { requestId: "req-1", siteId: "site-1", code },
      });
    } else {
      expect(conflictEvents).toHaveLength(0);
    }
  });

  it("returns a generic 500 internal_error without leaking the failure detail", async () => {
    const controller = buildQuoteController({ createQuoteError: new Error("boom: connection string leaked") });

    const response = await controller.createPublicWebsiteQuote(buildQuoteEvent());

    expect(response.statusCode).toBe(500);
    const { error } = parseBody(response);
    expect(error.code).toBe("internal_error");
    expect(error.requestId).toBe("req-1");
    expect(error.message).not.toContain("boom");
  });

  it("generates a requestId when API Gateway does not provide one", async () => {
    const controller = buildQuoteController();

    const response = await controller.createPublicWebsiteQuote(
      buildQuoteEvent({ body: JSON.stringify({}), requestContext: undefined })
    );

    expect(response.statusCode).toBe(400);
    const { error } = parseBody(response);
    expect(typeof error.requestId).toBe("string");
    expect(error.requestId.length).toBeGreaterThan(0);
  });
});
