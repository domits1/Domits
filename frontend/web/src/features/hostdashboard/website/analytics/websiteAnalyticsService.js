import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

const buildWebsiteAnalyticsUrl = () => `${PROPERTY_API_BASE}/website/event`;

const getOptionalAccessToken = () => getAccessToken();

const postWebsiteAnalyticsEvent = async ({ authorization, body }) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  const response = await fetch(buildWebsiteAnalyticsUrl(), {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Website analytics event request failed.");
  }
};

export const recordWebsiteHostAnalyticsEvent = async ({
  propertyId,
  draftId = "",
  eventType,
  payload = {},
}) => {
  const authorization = getOptionalAccessToken();
  if (!authorization) {
    throw new Error("Missing access token for website analytics event.");
  }

  await postWebsiteAnalyticsEvent({
    authorization,
    body: {
      propertyId,
      draftId,
      eventType,
      payload,
    },
  });
};

export const recordPublicWebsiteAnalyticsEvent = async ({
  draftId,
  eventType,
  payload = {},
}) => {
  await postWebsiteAnalyticsEvent({
    authorization: "",
    body: {
      draftId,
      eventType,
      payload,
    },
  });
};

export const recordWebsiteHostAnalyticsEventSafely = async (eventInput) => {
  try {
    await recordWebsiteHostAnalyticsEvent(eventInput);
  } catch {
    // KPI ingestion should never block host workflow.
  }
};

export const recordPublicWebsiteAnalyticsEventSafely = async (eventInput) => {
  try {
    await recordPublicWebsiteAnalyticsEvent(eventInput);
  } catch {
    // Public preview telemetry is best-effort only.
  }
};
