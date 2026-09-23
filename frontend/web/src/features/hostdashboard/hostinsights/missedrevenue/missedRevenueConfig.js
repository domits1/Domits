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

const createMetricCardDefinition = (id, title, valueKey, meta, formatterKey) => ({
  id,
  title,
  valueKey,
  meta,
  formatterKey,
});

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
    "percentage"
  ),
]);

export const buildMissedRevenueMetricCards = (missedRevenue) =>
  MISSED_REVENUE_METRIC_CARD_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    value: formatMetricValue(missedRevenue?.[definition.valueKey], definition.formatterKey),
    meta: definition.meta,
  }));
