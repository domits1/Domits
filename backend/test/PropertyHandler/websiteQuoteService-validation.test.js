import fc from "fast-check";
import { describe, it, expect } from "@jest/globals";
import {
  WebsiteQuoteError,
  WEBSITE_QUOTE_ERROR_CODES,
} from "../../functions/PropertyHandler/util/exception/WebsiteQuoteError.js";
import {
  parseQuoteStayDates,
  assertQuoteGuestCount,
  resolveStayRestrictions,
  assertStayRestrictions,
} from "../../functions/PropertyHandler/business/service/websiteQuoteService.js";

const NOW = Date.parse("2026-09-02T10:00:00.000Z");

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

describe("WebsiteQuoteError", () => {
  it("carries the design-pack code and the HTTP status for it", () => {
    const error = new WebsiteQuoteError(WEBSITE_QUOTE_ERROR_CODES.UNAVAILABLE_DATES, "Dates taken.");
    expect(error.code).toBe("unavailable_dates");
    expect(error.statusCode).toBe(409);
    expect(error.name).toBe("WebsiteQuoteError");
  });

  it("refuses an unknown code so mapping stays exhaustive", () => {
    expect(() => new WebsiteQuoteError("made_up_code", "nope")).toThrow(TypeError);
  });
});

describe("parseQuoteStayDates", () => {
  it("returns nights and one night key per stayed night, checkout-exclusive", () => {
    const stay = parseQuoteStayDates({ checkIn: "2026-10-01", checkOut: "2026-10-05", now: NOW });
    expect(stay.nights).toBe(4);
    expect(stay.stayNightKeys).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  it("accepts a stay starting today (UTC)", () => {
    const stay = parseQuoteStayDates({ checkIn: "2026-09-02", checkOut: "2026-09-03", now: NOW });
    expect(stay.nights).toBe(1);
  });

  it.each([
    ["missing checkIn", { checkOut: "2026-10-05" }],
    ["missing checkOut", { checkIn: "2026-10-01" }],
    ["non-ISO format", { checkIn: "01-10-2026", checkOut: "2026-10-05" }],
    ["datetime instead of date", { checkIn: "2026-10-01T00:00:00Z", checkOut: "2026-10-05" }],
    ["impossible calendar date", { checkIn: "2026-02-30", checkOut: "2026-03-02" }],
    ["checkOut equal to checkIn", { checkIn: "2026-10-01", checkOut: "2026-10-01" }],
    ["checkOut before checkIn", { checkIn: "2026-10-05", checkOut: "2026-10-01" }],
    ["checkIn in the past", { checkIn: "2026-09-01", checkOut: "2026-09-05" }],
  ])("rejects %s as invalid_date_range", (_label, dates) => {
    expectQuoteError(
      () => parseQuoteStayDates({ ...dates, now: NOW }),
      WEBSITE_QUOTE_ERROR_CODES.INVALID_DATE_RANGE
    );
  });

  it("rejects stays longer than the engine cap as invalid_date_range", () => {
    expectQuoteError(
      () => parseQuoteStayDates({ checkIn: "2026-10-01", checkOut: "2027-10-03", now: NOW }),
      WEBSITE_QUOTE_ERROR_CODES.INVALID_DATE_RANGE
    );
  });

  it("always produces exactly nights night-keys starting at checkIn", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 300 }), fc.integer({ min: 1, max: 60 }), (startOffset, nights) => {
        const checkInMs = NOW + startOffset * 86_400_000;
        const checkOutMs = checkInMs + nights * 86_400_000;
        const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);
        const stay = parseQuoteStayDates({ checkIn: toKey(checkInMs), checkOut: toKey(checkOutMs), now: NOW });
        return (
          stay.nights === nights &&
          stay.stayNightKeys.length === nights &&
          stay.stayNightKeys[0] === toKey(checkInMs)
        );
      })
    );
  });
});

describe("assertQuoteGuestCount", () => {
  it("accepts an integer count within capacity", () => {
    expect(() => assertQuoteGuestCount({ guests: 2, capacity: 4 })).not.toThrow();
    expect(() => assertQuoteGuestCount({ guests: 4, capacity: 4 })).not.toThrow();
  });

  it("enforces no upper bound when the property declares no capacity", () => {
    expect(() => assertQuoteGuestCount({ guests: 12, capacity: null })).not.toThrow();
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1.5],
    ["numeric string", "2"],
    ["missing", undefined],
  ])("rejects a %s guest count as invalid_guest_count", (_label, guests) => {
    expectQuoteError(
      () => assertQuoteGuestCount({ guests, capacity: 4 }),
      WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT
    );
  });

  it("rejects a count above capacity as invalid_guest_count", () => {
    expectQuoteError(
      () => assertQuoteGuestCount({ guests: 5, capacity: 4 }),
      WEBSITE_QUOTE_ERROR_CODES.INVALID_GUEST_COUNT
    );
  });
});

describe("resolveStayRestrictions", () => {
  it("reads the known restriction rows and coerces their values", () => {
    const restrictions = resolveStayRestrictions([
      { restriction: "MinimumStay", value: "2" },
      { restriction: "MaximumStay", value: 14 },
      { restriction: "MinimumAdvanceReservation", value: "1" },
      { restriction: "MaximumAdvanceReservation", value: "180" },
      { restriction: "WeeklyDiscountPercent", value: "10" },
    ]);
    expect(restrictions).toEqual({
      minimumStay: 2,
      maximumStay: 14,
      minimumAdvanceDays: 1,
      maximumAdvanceDays: 180,
    });
  });

  it("ignores absent, non-numeric, and non-positive values", () => {
    expect(
      resolveStayRestrictions([
        { restriction: "MinimumStay", value: "soon" },
        { restriction: "MaximumStay", value: 0 },
        { restriction: "MinimumAdvanceReservation", value: -3 },
      ])
    ).toEqual({ minimumStay: null, maximumStay: null, minimumAdvanceDays: null, maximumAdvanceDays: null });
    expect(resolveStayRestrictions(null)).toEqual({
      minimumStay: null,
      maximumStay: null,
      minimumAdvanceDays: null,
      maximumAdvanceDays: null,
    });
  });
});

describe("assertStayRestrictions", () => {
  const baseStay = { nights: 4, checkInKey: "2026-10-01", now: NOW };

  it("passes and reports the policies it enforced", () => {
    const applied = assertStayRestrictions({
      ...baseStay,
      restrictions: { minimumStay: 2, maximumStay: 14, minimumAdvanceDays: 1, maximumAdvanceDays: 180 },
    });
    expect(applied).toEqual(["minimum_stay", "maximum_stay", "minimum_advance_reservation", "maximum_advance_reservation"]);
  });

  it("reports nothing when the property declares no restrictions", () => {
    expect(
      assertStayRestrictions({
        ...baseStay,
        restrictions: { minimumStay: null, maximumStay: null, minimumAdvanceDays: null, maximumAdvanceDays: null },
      })
    ).toEqual([]);
  });

  it.each([
    ["below minimum stay", { minimumStay: 5 }],
    ["above maximum stay", { maximumStay: 3 }],
    ["check-in earlier than the minimum advance", { minimumAdvanceDays: 60 }],
    ["check-in later than the maximum advance", { maximumAdvanceDays: 7 }],
  ])("rejects a stay %s as stay_restriction_violation", (_label, partial) => {
    expectQuoteError(
      () =>
        assertStayRestrictions({
          ...baseStay,
          restrictions: {
            minimumStay: null,
            maximumStay: null,
            minimumAdvanceDays: null,
            maximumAdvanceDays: null,
            ...partial,
          },
        }),
      WEBSITE_QUOTE_ERROR_CODES.STAY_RESTRICTION_VIOLATION
    );
  });

  it("refuses an unparseable check-in key instead of skipping advance checks", () => {
    expect(() =>
      assertStayRestrictions({
        nights: 4,
        checkInKey: "not-a-date",
        now: NOW,
        restrictions: { minimumStay: null, maximumStay: null, minimumAdvanceDays: 3, maximumAdvanceDays: null },
      })
    ).toThrow(TypeError);
  });

  it("treats the advance boundaries as inclusive", () => {
    // 2026-10-01 is 29 days after 2026-09-02 (UTC).
    const restrictions = { minimumStay: null, maximumStay: null, minimumAdvanceDays: 29, maximumAdvanceDays: 29 };
    expect(assertStayRestrictions({ ...baseStay, restrictions })).toEqual([
      "minimum_advance_reservation",
      "maximum_advance_reservation",
    ]);
  });
});
