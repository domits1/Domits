export const MISSED_REVENUE_COUNT_FIELD_KEYS = Object.freeze([
  "unbookedNightsWithPriceData",
  "unbookedNightsWithoutPriceData",
  "potentialOccupiedNights",
  "potentialNightsWithPriceData",
  "potentialNightsWithoutPriceData",
]);

export const MISSED_REVENUE_AMOUNT_FIELD_KEYS = Object.freeze(["grossMissedRevenue", "actualRevenue", "potentialRevenue"]);

export const MISSED_REVENUE_PERCENTAGE_FIELD_KEYS = Object.freeze(["priceDataCoveragePct", "revenueEfficiencyPct"]);

const buildEmptyMissedRevenue = () => ({
  connected: false,
  startDate: null,
  endDate: null,
  currency: "EUR",
  ...Object.fromEntries(MISSED_REVENUE_COUNT_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  ...Object.fromEntries(MISSED_REVENUE_AMOUNT_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  ...Object.fromEntries(MISSED_REVENUE_PERCENTAGE_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  byProperty: [],
});

export const EMPTY_MISSED_REVENUE = Object.freeze(buildEmptyMissedRevenue());
