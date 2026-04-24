import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildWebsiteKpisUrl = () => `${PROPERTY_API_BASE}/website/kpis`;

const getRequiredAccessToken = () => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to view website KPIs.");
  }

  return accessToken;
};

const normalizeNumericMetric = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const fetchWebsiteKpis = async () => {
  const response = await fetch(buildWebsiteKpisUrl(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: getRequiredAccessToken(),
    },
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the standalone website KPI overview."
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

  return {
    currentDraftCount: normalizeNumericMetric(parsedBody?.currentDraftCount),
    draftCreatedCount: normalizeNumericMetric(parsedBody?.draftCreatedCount),
    draftSaveCount: normalizeNumericMetric(parsedBody?.draftSaveCount),
    publicPreviewViewCount: normalizeNumericMetric(parsedBody?.publicPreviewViewCount),
    uniquePreviewedWebsiteCount: normalizeNumericMetric(parsedBody?.uniquePreviewedWebsiteCount),
    livePreviewUpdateCount: normalizeNumericMetric(parsedBody?.livePreviewUpdateCount),
    deletedWebsiteCount: normalizeNumericMetric(parsedBody?.deletedWebsiteCount),
    lastPublicPreviewAt: normalizeNumericMetric(parsedBody?.lastPublicPreviewAt),
    lastLivePreviewUpdateAt: normalizeNumericMetric(parsedBody?.lastLivePreviewUpdateAt),
    deletionReasonBreakdown,
  };
};
