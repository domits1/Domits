import { Auth } from "aws-amplify";
import { getApiErrorMessage } from "../../../hostproperty/utils/hostPropertyUtils";
import {
  EMPTY_MISSED_REVENUE,
  MISSED_REVENUE_AMOUNT_FIELD_KEYS,
  MISSED_REVENUE_COUNT_FIELD_KEYS,
  MISSED_REVENUE_PERCENTAGE_FIELD_KEYS,
} from "../missedRevenueFields";

const BASE = "https://wq2aughzk2.execute-api.eu-north-1.amazonaws.com/default";

async function authHeaders() {
  const session = await Auth.currentSession();
  const token = session.getAccessToken().getJwtToken();
  return { Authorization: `Bearer ${token}` };
}

const normalizeNumericMetric = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const normalizeMetricGroup = (parsedBody, fieldKeys) =>
  Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, normalizeNumericMetric(parsedBody?.[fieldKey])]));

const normalizeByProperty = (byProperty) =>
  Array.isArray(byProperty)
    ? byProperty.map((entry) => ({
        propertyId: String(entry?.propertyId || ""),
        missedRevenue: normalizeNumericMetric(entry?.missedRevenue),
        actualRevenue: normalizeNumericMetric(entry?.actualRevenue),
        potentialRevenue: normalizeNumericMetric(entry?.potentialRevenue),
        potentialOccupiedNights: normalizeNumericMetric(entry?.potentialOccupiedNights),
        unbookedNightsWithPriceData: normalizeNumericMetric(entry?.unbookedNightsWithPriceData),
      }))
    : [];

const buildUrl = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString();
  return `${BASE}/insights/missed-revenue${query ? `?${query}` : ""}`;
};

export const fetchMissedRevenue = async ({ startDate, endDate } = {}) => {
  const response = await fetch(buildUrl(startDate, endDate), {
    method: "GET",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "We could not load your missed revenue insights."));
  }

  const parsedBody = await response.json();

  if (parsedBody?.connected === false) {
    return { ...EMPTY_MISSED_REVENUE, connected: false };
  }

  return {
    ...EMPTY_MISSED_REVENUE,
    connected: true,
    startDate: parsedBody?.startDate ?? null,
    endDate: parsedBody?.endDate ?? null,
    currency: parsedBody?.currency || EMPTY_MISSED_REVENUE.currency,
    ...normalizeMetricGroup(parsedBody, MISSED_REVENUE_COUNT_FIELD_KEYS),
    ...normalizeMetricGroup(parsedBody, MISSED_REVENUE_AMOUNT_FIELD_KEYS),
    ...normalizeMetricGroup(parsedBody, MISSED_REVENUE_PERCENTAGE_FIELD_KEYS),
    byProperty: normalizeByProperty(parsedBody?.byProperty),
  };
};
