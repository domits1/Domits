import {
  EMPTY_MISSED_REVENUE,
  MISSED_REVENUE_AMOUNT_FIELD_KEYS,
  MISSED_REVENUE_COUNT_FIELD_KEYS,
  MISSED_REVENUE_PERCENTAGE_FIELD_KEYS,
  formatMissedRevenueCurrency,
} from "./missedRevenueFields";

describe("formatMissedRevenueCurrency", () => {
  test("prefixes the amount with the given currency code instead of a hardcoded one", () => {
    expect(formatMissedRevenueCurrency(120.5, "EUR")).toBe("EUR 120.50");
    expect(formatMissedRevenueCurrency(120.5, "USD")).toBe("USD 120.50");
  });
});

describe("EMPTY_MISSED_REVENUE", () => {
  test("defaults to not connected with no date range", () => {
    expect(EMPTY_MISSED_REVENUE.connected).toBe(false);
    expect(EMPTY_MISSED_REVENUE.startDate).toBeNull();
    expect(EMPTY_MISSED_REVENUE.endDate).toBeNull();
    expect(EMPTY_MISSED_REVENUE.currency).toBe("EUR");
  });

  test("defaults every count and amount field to 0", () => {
    [...MISSED_REVENUE_COUNT_FIELD_KEYS, ...MISSED_REVENUE_AMOUNT_FIELD_KEYS].forEach((fieldKey) => {
      expect(EMPTY_MISSED_REVENUE[fieldKey]).toBe(0);
    });
  });

  test("defaults every percentage field to 0", () => {
    MISSED_REVENUE_PERCENTAGE_FIELD_KEYS.forEach((fieldKey) => {
      expect(EMPTY_MISSED_REVENUE[fieldKey]).toBe(0);
    });
  });

  test("defaults byProperty to an empty array", () => {
    expect(EMPTY_MISSED_REVENUE.byProperty).toEqual([]);
  });

  test("defaults byDate to an empty array and comparison to null", () => {
    expect(EMPTY_MISSED_REVENUE.byDate).toEqual([]);
    expect(EMPTY_MISSED_REVENUE.comparison).toBeNull();
  });

  test("defaults every root-cause category to zero missed revenue and zero nights", () => {
    expect(EMPTY_MISSED_REVENUE.rootCause).toEqual({
      restriction: { missedRevenue: 0, nights: 0 },
      pricing: { missedRevenue: 0, nights: 0 },
      occupancy: { missedRevenue: 0, nights: 0 },
    });
  });

  test("is frozen so callers cannot mutate the shared default", () => {
    expect(Object.isFrozen(EMPTY_MISSED_REVENUE)).toBe(true);
  });
});
