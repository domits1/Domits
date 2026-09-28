import {
  EMPTY_MISSED_REVENUE,
  MISSED_REVENUE_AMOUNT_FIELD_KEYS,
  MISSED_REVENUE_COUNT_FIELD_KEYS,
  MISSED_REVENUE_PERCENTAGE_FIELD_KEYS,
} from "./missedRevenueFields";

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

  test("is frozen so callers cannot mutate the shared default", () => {
    expect(Object.isFrozen(EMPTY_MISSED_REVENUE)).toBe(true);
  });
});
