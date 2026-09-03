import { describe, it, expect } from "@jest/globals";
import { WEBSITE_QUOTE_ERROR_CODES, WebsiteQuoteError } from "../../functions/PropertyHandler/util/exception/WebsiteQuoteError.js";
import {
  assertPropertyIsQuotable,
  assertStayNightsAvailable,
  buildQuotePriceBreakdown,
  summarizeAvailabilityWindows,
} from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";

const expectQuoteError = (run, code) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(WebsiteQuoteError);
    expect(error.code).toBe(code);
    return error;
  }
  throw new Error(`Expected a WebsiteQuoteError with code ${code}.`);
};

// One October 2026 window, expressed as the DB stores it: epoch milliseconds.
const OCTOBER_WINDOW = {
  availableStartDate: Date.UTC(2026, 9, 1),
  availableEndDate: Date.UTC(2026, 9, 31),
};

const emptyCalendar = { externalBlockedDates: [], availableDateKeys: [], unavailableDateKeys: [] };
const STAY = ["2026-10-01", "2026-10-02", "2026-10-03"];

describe("assertPropertyIsQuotable", () => {
  it("accepts an ACTIVE property", () => {
    expect(() => assertPropertyIsQuotable({ id: "p1", status: "ACTIVE" })).not.toThrow();
  });

  it.each([
    ["missing property", null],
    ["inactive property", { id: "p1", status: "INACTIVE" }],
    ["missing status", { id: "p1" }],
  ])("rejects a %s as quote_unavailable", (_label, property) => {
    expectQuoteError(() => assertPropertyIsQuotable(property), WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE);
  });
});

describe("assertStayNightsAvailable", () => {
  it("passes when every night is inside a window and unblocked, and reports the policy", () => {
    const applied = assertStayNightsAvailable({
      stayNightKeys: STAY,
      calendarAvailability: emptyCalendar,
      availabilityWindows: [OCTOBER_WINDOW],
    });
    expect(applied).toEqual(["availability_window"]);
  });

  it("ignores blocks on the checkout day itself (nights are checkout-exclusive)", () => {
    expect(() =>
      assertStayNightsAvailable({
        stayNightKeys: STAY,
        calendarAvailability: { ...emptyCalendar, unavailableDateKeys: ["2026-10-04"] },
        availabilityWindows: [OCTOBER_WINDOW],
      })
    ).not.toThrow();
  });

  it.each([
    ["an unavailable-override or booked night", { unavailableDateKeys: ["2026-10-02"] }],
    ["an externally synced blocked night", { externalBlockedDates: ["2026-10-02"] }],
    ["a YYYYMMDD-int blocked night", { unavailableDateKeys: [20261002] }],
  ])("rejects %s as unavailable_dates", (_label, partialCalendar) => {
    expectQuoteError(
      () =>
        assertStayNightsAvailable({
          stayNightKeys: STAY,
          calendarAvailability: { ...emptyCalendar, ...partialCalendar },
          availabilityWindows: [OCTOBER_WINDOW],
        }),
      WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES
    );
  });

  it("rejects a night outside every availability window", () => {
    expectQuoteError(
      () =>
        assertStayNightsAvailable({
          stayNightKeys: ["2026-11-01", "2026-11-02"],
          calendarAvailability: emptyCalendar,
          availabilityWindows: [OCTOBER_WINDOW],
        }),
      WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES
    );
  });

  it("mirrors the booking guard: with no windows and no overrides, nothing is bookable", () => {
    expectQuoteError(
      () =>
        assertStayNightsAvailable({
          stayNightKeys: STAY,
          calendarAvailability: emptyCalendar,
          availabilityWindows: [],
        }),
      WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES
    );
  });

  it("lets an available-override open a night outside the windows", () => {
    expect(() =>
      assertStayNightsAvailable({
        stayNightKeys: ["2026-11-01"],
        calendarAvailability: { ...emptyCalendar, availableDateKeys: ["2026-11-01"] },
        availabilityWindows: [OCTOBER_WINDOW],
      })
    ).not.toThrow();
  });

  it("keeps a booked night blocked even when an available-override also lists it", () => {
    expectQuoteError(
      () =>
        assertStayNightsAvailable({
          stayNightKeys: ["2026-10-01"],
          calendarAvailability: {
            ...emptyCalendar,
            availableDateKeys: ["2026-10-01"],
            unavailableDateKeys: ["2026-10-01"],
          },
          availabilityWindows: [OCTOBER_WINDOW],
        }),
      WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES
    );
  });

  it("accepts windows stored as date keys or YYYYMMDD ints as well as epoch ms", () => {
    for (const window of [
      { availableStartDate: "2026-10-01", availableEndDate: "2026-10-31" },
      { availableStartDate: 20261001, availableEndDate: 20261031 },
    ]) {
      expect(() =>
        assertStayNightsAvailable({
          stayNightKeys: STAY,
          calendarAvailability: emptyCalendar,
          availabilityWindows: [window],
        })
      ).not.toThrow();
    }
  });
});

describe("buildQuotePriceBreakdown", () => {
  it("prices nights in minor units with a flat cleaning fee", () => {
    const breakdown = buildQuotePriceBreakdown({
      pricing: { roomRate: 190, cleaning: 50 },
      nights: 4,
    });
    expect(breakdown).toEqual({
      currency: "EUR",
      nightlyBaseTotal: 76000,
      cleaningFee: 5000,
      discounts: [],
      taxes: [],
      fees: [],
      total: 81000,
    });
  });

  it("rounds fractional euro rates to whole cents", () => {
    const breakdown = buildQuotePriceBreakdown({ pricing: { roomRate: 99.99, cleaning: 0.011 }, nights: 2 });
    expect(breakdown.nightlyBaseTotal).toBe(19998);
    expect(breakdown.cleaningFee).toBe(1);
    expect(breakdown.total).toBe(19999);
  });

  it("treats a missing cleaning fee as zero", () => {
    const breakdown = buildQuotePriceBreakdown({ pricing: { roomRate: 100, cleaning: null }, nights: 1 });
    expect(breakdown.cleaningFee).toBe(0);
    expect(breakdown.total).toBe(10000);
  });

  it.each([
    ["missing pricing row", null],
    ["missing room rate", { cleaning: 50 }],
    ["zero room rate", { roomRate: 0, cleaning: 50 }],
    ["negative room rate", { roomRate: -10, cleaning: 50 }],
    ["negative cleaning fee", { roomRate: 100, cleaning: -5 }],
  ])("fails closed on %s as quote_unavailable", (_label, pricing) => {
    expectQuoteError(
      () => buildQuotePriceBreakdown({ pricing, nights: 2 }),
      WEBSITE_QUOTE_ERROR_CODES.QUOTE_UNAVAILABLE
    );
  });
});

describe("summarizeAvailabilityWindows", () => {
  it("returns the earliest start and latest end as date keys", () => {
    const summary = summarizeAvailabilityWindows([
      OCTOBER_WINDOW,
      { availableStartDate: Date.UTC(2026, 11, 1), availableEndDate: Date.UTC(2026, 11, 31) },
    ]);
    expect(summary).toEqual({ bookableFrom: "2026-10-01", bookableUntil: "2026-12-31" });
  });

  it("returns nulls when the property declares no windows", () => {
    expect(summarizeAvailabilityWindows([])).toEqual({ bookableFrom: null, bookableUntil: null });
    expect(summarizeAvailabilityWindows(null)).toEqual({ bookableFrom: null, bookableUntil: null });
  });
});
