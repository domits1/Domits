export { EMPTY_MISSED_REVENUE } from "./missedRevenueFields";

const MISSED_REVENUE_EMPTY_VALUE = "No data yet";

const createCurrencyFormatter = () => (value) => `EUR ${value.toFixed(2)}`;
const createPercentageFormatter = () => (value) => `${value.toFixed(1)}%`;

const formatters = Object.freeze({
  eur: createCurrencyFormatter(),
  percentage: createPercentageFormatter(),
});

const formatMetricValue = (value, formatterKey) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MISSED_REVENUE_EMPTY_VALUE;
  }

  return formatters[formatterKey](value);
};

const MISSED_REVENUE_NOT_APPLICABLE_VALUE = "–";

const createMetricCardDefinition = (id, title, valueKey, meta, formatterKey, requiresPositiveKey) => ({
  id,
  title,
  valueKey,
  meta,
  formatterKey,
  requiresPositiveKey,
});

// A ratio over a zero denominator is undefined, not 0%: without PriceLabs prices there is nothing to compare against.
const isMetricApplicable = (missedRevenue, definition) =>
  !definition.requiresPositiveKey || missedRevenue?.[definition.requiresPositiveKey] > 0;

const MISSED_REVENUE_METRIC_CARD_DEFINITIONS = Object.freeze([
  createMetricCardDefinition(
    "actual-revenue",
    "Actual revenue",
    "actualRevenue",
    "Revenue actually booked in this period, net of refunds.",
    "eur"
  ),
  createMetricCardDefinition(
    "potential-revenue",
    "Potential revenue",
    "potentialRevenue",
    "What every sellable night could have earned at PriceLabs' suggested rate.",
    "eur"
  ),
  createMetricCardDefinition(
    "gross-missed-revenue",
    "Gross missed revenue",
    "grossMissedRevenue",
    "Revenue left on the table from unbooked nights.",
    "eur"
  ),
  createMetricCardDefinition(
    "revenue-efficiency",
    "Revenue efficiency",
    "revenueEfficiencyPct",
    "Actual revenue as a share of potential revenue.",
    "percentage",
    "potentialRevenue"
  ),
]);

export const buildMissedRevenueMetricCards = (missedRevenue) =>
  MISSED_REVENUE_METRIC_CARD_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    value: isMetricApplicable(missedRevenue, definition)
      ? formatMetricValue(missedRevenue?.[definition.valueKey], definition.formatterKey)
      : MISSED_REVENUE_NOT_APPLICABLE_VALUE,
    meta: definition.meta,
  }));
