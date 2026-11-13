import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { WebsiteSessionExpiredError, fetchWithWebsiteSession } from "../services/websiteSession";

const buildWebsiteAnalyticsUrl = () => `${PROPERTY_API_BASE}/website/event`;
const TERMINAL_EVENT_RETRY_DELAYS_MS = Object.freeze([0, 250, 1000]);

const waitForDelay = (delayMs) =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const sendWithoutSession = (url, init) => fetch(url, init);

const postWebsiteAnalyticsEvent = async ({ send, body, keepalive = false }) => {
  const response = await send(buildWebsiteAnalyticsUrl(), {
    method: "POST",
    cache: "no-store",
    mode: "cors",
    keepalive,
    headers: {
      "Content-Type": "application/json",
    },
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
  keepalive = false,
}) => {
  await postWebsiteAnalyticsEvent({
    send: fetchWithWebsiteSession,
    keepalive,
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
    send: sendWithoutSession,
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

  for (const retryDelayMs of retryDelaysMs) {
    try {
      if (retryDelayMs > 0) {
        await waitForDelay(retryDelayMs);
      }

      await recordWebsiteHostAnalyticsEvent(eventInput);
      return;
    } catch (error) {
      if (error instanceof WebsiteSessionExpiredError) {
        throw error;
      }
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
