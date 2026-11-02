import { PROPERTY_API_BASE } from "../../../hostproperty/constants";
import { getApiErrorMessage } from "../../../hostproperty/utils/hostPropertyUtils";
import { fetchWithWebsiteSession } from "../../services/websiteSession";
import {
  EMPTY_WEBSITE_KPIS,
  WEBSITE_KPI_COUNT_FIELD_KEYS,
  WEBSITE_KPI_NULLABLE_FIELD_KEYS,
} from "../websiteKpiFields";

const buildWebsiteKpisUrl = () => `${PROPERTY_API_BASE}/website/kpis`;

const normalizeNumericMetric = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const normalizeNullableMetric = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const normalizeMetricGroup = (parsedBody, fieldKeys, normalizer) =>
  Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, normalizer(parsedBody?.[fieldKey])]));

export const fetchWebsiteKpis = async () => {
  const response = await fetchWithWebsiteSession(buildWebsiteKpisUrl(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the direct booking website KPI overview."
    );
    throw new Error(errorMessage);
  }

  const parsedBody = await response.json();
  const deletionReasonBreakdown = Array.isArray(parsedBody?.deletionReasonBreakdown)
    ? parsedBody.deletionReasonBreakdown
        .map((entry) => ({
          reason: String(entry?.reason || "").trim(),
          count: normalizeNumericMetric(entry?.count),
        }))
        .filter((entry) => entry.reason)
    : [];
  const kpiReadiness =
    parsedBody?.kpiReadiness && typeof parsedBody.kpiReadiness === "object"
      ? Object.fromEntries(
          Object.entries(parsedBody.kpiReadiness).map(([kpiId, readiness]) => [
            String(kpiId || "").trim(),
            {
              state: String(readiness?.state || "").trim().toLowerCase(),
            },
          ])
        )
      : {};

  return {
    ...EMPTY_WEBSITE_KPIS,
    ...normalizeMetricGroup(parsedBody, WEBSITE_KPI_COUNT_FIELD_KEYS, normalizeNumericMetric),
    ...normalizeMetricGroup(parsedBody, WEBSITE_KPI_NULLABLE_FIELD_KEYS, normalizeNullableMetric),
    kpiReadiness,
    deletionReasonBreakdown,
  };
};
