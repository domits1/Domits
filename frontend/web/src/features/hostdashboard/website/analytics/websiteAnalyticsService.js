import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

const buildWebsiteAnalyticsUrl = () => `${PROPERTY_API_BASE}/website/event`;
const TERMINAL_EVENT_RETRY_DELAYS_MS = Object.freeze([0, 250, 1000]);

const getOptionalAccessToken = () => getAccessToken();
const waitForDelay = (delayMs) =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const postWebsiteAnalyticsEvent = async ({ authorization, body, keepalive = false }) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  const response = await fetch(buildWebsiteAnalyticsUrl(), {
    method: "POST",
    cache: "no-store",
    mode: "cors",
    keepalive,
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
  siteId = "",
  domain = "",
  eventType,
  payload = {},
}) => {
  await postWebsiteAnalyticsEvent({
    authorization: "",
    keepalive: true,
    body: {
      draftId,
      siteId,
      domain,
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

export const recordWebsiteHostAnalyticsEventWithRetry = async (
  eventInput,
  retryDelaysMs = TERMINAL_EVENT_RETRY_DELAYS_MS
) => {
  let lastError = null;

  for (let index = 0; index < retryDelaysMs.length; index += 1) {
    try {
      if (retryDelaysMs[index] > 0) {
        await waitForDelay(retryDelaysMs[index]);
      }

      await recordWebsiteHostAnalyticsEvent(eventInput);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Website analytics event request failed.");
};

export const recordPublicWebsiteAnalyticsEventSafely = async (eventInput) => {
  try {
    await recordPublicWebsiteAnalyticsEvent(eventInput);
  } catch {
    // Public website telemetry is best-effort only.
  }
};
