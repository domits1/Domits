export const MISSED_REVENUE_COUNT_FIELD_KEYS = Object.freeze([
  "unbookedNightsWithPriceData",
  "unbookedNightsWithoutPriceData",
  "potentialOccupiedNights",
  "potentialNightsWithPriceData",
  "potentialNightsWithoutPriceData",
]);

export const MISSED_REVENUE_AMOUNT_FIELD_KEYS = Object.freeze(["grossMissedRevenue", "actualRevenue", "potentialRevenue"]);

export const MISSED_REVENUE_PERCENTAGE_FIELD_KEYS = Object.freeze(["priceDataCoveragePct", "revenueEfficiencyPct"]);

export const ROOT_CAUSE_KEYS = Object.freeze(["restriction", "pricing", "occupancy"]);

const buildEmptyRootCause = () =>
  Object.fromEntries(ROOT_CAUSE_KEYS.map((causeKey) => [causeKey, { missedRevenue: 0, nights: 0 }]));

const buildEmptyMissedRevenue = () => ({
  connected: false,
  startDate: null,
  endDate: null,
  currency: "EUR",
  ...Object.fromEntries(MISSED_REVENUE_COUNT_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  ...Object.fromEntries(MISSED_REVENUE_AMOUNT_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  ...Object.fromEntries(MISSED_REVENUE_PERCENTAGE_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  byProperty: [],
  byDate: [],
  rootCause: buildEmptyRootCause(),
  comparison: null,
});

export const EMPTY_MISSED_REVENUE = Object.freeze(buildEmptyMissedRevenue());
