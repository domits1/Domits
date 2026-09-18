import { describe, it, expect, jest } from "@jest/globals";
import { WebsiteQuoteService } from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";
import { WebsiteQuoteError } from "../../functions/PropertyHandler/util/exception/WebsiteQuoteError.js";
import { verifyWebsiteQuoteToken } from "../../functions/.shared/websiteQuoteToken.js";

const SECRET = "quote-secret";
const NOW = Date.parse("2026-09-02T10:00:00.000Z");
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

const QUOTE_INPUT = {
  siteId: "site-1",
  propertyId: "property-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  currency: "EUR",
};

const buildFakePropertyService = (overrides = {}) => ({
  getBasePropertyInfo: jest.fn().mockResolvedValue({ id: "property-1", status: "ACTIVE" }),
  getGeneralDetails: jest.fn().mockResolvedValue([{ detail: "Guests", value: "4" }]),
  getAvailabilityRestrictions: jest.fn().mockResolvedValue([{ restriction: "MinimumStay", value: "2" }]),
  getAvailability: jest
    .fn()
    .mockResolvedValue([{ availableStartDate: Date.UTC(2026, 9, 1), availableEndDate: Date.UTC(2026, 9, 31) }]),
  getPricing: jest.fn().mockResolvedValue({ property_id: "property-1", roomRate: 190, cleaning: 50 }),
  getPublicCalendarAvailability: jest
    .fn()
    .mockResolvedValue({ externalBlockedDates: [], availableDateKeys: [], unavailableDateKeys: [] }),
  ...overrides,
});

const buildService = (propertyServiceOverrides = {}, serviceOverrides = {}) =>
  new WebsiteQuoteService({
    propertyService: buildFakePropertyService(propertyServiceOverrides),
    quoteTokenSecretProvider: async () => SECRET,
    clock: () => NOW,
    ...serviceOverrides,
  });

const expectQuoteErrorCode = async (promise, code) => {
  await expect(promise).rejects.toBeInstanceOf(WebsiteQuoteError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe("WebsiteQuoteService.createQuote", () => {
  it("returns the design-pack quote shape for a bookable stay", async () => {
    const quote = await buildService().createQuote(QUOTE_INPUT);

    expect(quote).toMatchObject({
      siteId: "site-1",
      propertyId: "property-1",
      timezone: null,
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      nights: 4,
      guestCount: 2,
      availability: {
        isAvailable: true,
        bookableFrom: "2026-10-01",
        bookableUntil: "2026-10-31",
        minimumStay: 2,
        maximumStay: null,
      },
      priceBreakdown: {
        currency: "EUR",
        nightlyBaseTotal: 76000,
        cleaningFee: 5000,
        discounts: [],
        taxes: [],
        fees: [],
        total: 81000,
      },
      policiesApplied: ["minimum_stay", "availability_window"],
      expiresAt: new Date(NOW + THIRTY_MINUTES_MS).toISOString(),
    });
    expect(quote.quoteId).toMatch(/^quote_/);
  });

  it("signs a token that verifies and pins the quoted stay and price", async () => {
    const quote = await buildService().createQuote(QUOTE_INPUT);
    const payload = verifyWebsiteQuoteToken(quote.quoteToken, SECRET, { now: NOW });

    expect(payload).toMatchObject({
      v: 1,
      quoteId: quote.quoteId,
      siteId: "site-1",
      propertyId: "property-1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      guests: 2,
      priceBreakdown: quote.priceBreakdown,
      expiresAt: quote.expiresAt,
    });
  });

  it("issues a fresh quoteId per call", async () => {
    const service = buildService();
    const [first, second] = [await service.createQuote(QUOTE_INPUT), await service.createQuote(QUOTE_INPUT)];
    expect(first.quoteId).not.toBe(second.quoteId);
  });

  it("defaults the currency to EUR and rejects any other currency", async () => {
    await expect(buildService().createQuote({ ...QUOTE_INPUT, currency: undefined })).resolves.toMatchObject({
      priceBreakdown: { currency: "EUR" },
    });
    await expectQuoteErrorCode(
      buildService().createQuote({ ...QUOTE_INPUT, currency: "USD" }),
      "quote_unavailable"
    );
  });

  it("rejects a guest count above the property capacity", async () => {
    await expectQuoteErrorCode(
      buildService().createQuote({ ...QUOTE_INPUT, guests: 5 }),
      "invalid_guest_count"
    );
  });

  it("rejects a stay on a property that is not ACTIVE", async () => {
    const service = buildService({
      getBasePropertyInfo: jest.fn().mockResolvedValue({ id: "property-1", status: "INACTIVE" }),
    });
    await expectQuoteErrorCode(service.createQuote(QUOTE_INPUT), "quote_unavailable");
  });

  it("treats a missing property as not bookable, not as a downstream failure", async () => {
    const notFound = Object.assign(new Error("Property not found."), { statusCode: 404 });
    const service = buildService({ getBasePropertyInfo: jest.fn().mockRejectedValue(notFound) });
    await expectQuoteErrorCode(service.createQuote(QUOTE_INPUT), "quote_unavailable");
  });

  it("maps a data-layer failure to pricing_service_unavailable", async () => {
    const service = buildService({ getPricing: jest.fn().mockRejectedValue(new Error("connection reset")) });
    await expectQuoteErrorCode(service.createQuote(QUOTE_INPUT), "pricing_service_unavailable");
  });

  it("rejects a stay with a blocked night as unavailable_dates", async () => {
    const service = buildService({
      getPublicCalendarAvailability: jest.fn().mockResolvedValue({
        externalBlockedDates: [],
        availableDateKeys: [],
        unavailableDateKeys: ["2026-10-03"],
      }),
    });
    await expectQuoteErrorCode(service.createQuote(QUOTE_INPUT), "unavailable_dates");
  });

  it("validates the stay before touching any repository", async () => {
    const propertyService = buildFakePropertyService();
    const service = new WebsiteQuoteService({
      propertyService,
      quoteTokenSecretProvider: async () => SECRET,
      clock: () => NOW,
    });
    await expect(
      service.createQuote({ ...QUOTE_INPUT, checkIn: "2026-10-05", checkOut: "2026-10-01" })
    ).rejects.toMatchObject({ code: "invalid_date_range" });
    expect(propertyService.getBasePropertyInfo).not.toHaveBeenCalled();
  });

  it("requires a quote token secret provider at construction", () => {
    expect(() => new WebsiteQuoteService({ propertyService: buildFakePropertyService() })).toThrow(TypeError);
  });

  it("propagates a misconfigured secret instead of disguising it as a quote error", async () => {
    const service = buildService({}, { quoteTokenSecretProvider: async () => "" });
    await expect(service.createQuote(QUOTE_INPUT)).rejects.toThrow(TypeError);
  });
});
