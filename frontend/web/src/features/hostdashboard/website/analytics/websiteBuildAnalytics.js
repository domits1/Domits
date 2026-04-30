import {
  WEBSITE_BUILD_FAILED_EVENT,
  WEBSITE_BUILD_STARTED_EVENT,
  WEBSITE_BUILD_SUCCEEDED_EVENT,
  WEBSITE_PREVIEW_READY_EVENT,
} from "./websiteAnalyticsEventTypes";

export const WEBSITE_BUILD_FAILURE_PHASE_PERSIST = "persist_draft";
export {
  WEBSITE_BUILD_FAILED_EVENT,
  WEBSITE_BUILD_STARTED_EVENT,
  WEBSITE_BUILD_SUCCEEDED_EVENT,
  WEBSITE_PREVIEW_READY_EVENT,
};

export const createWebsiteBuildAttemptId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `website-build-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getBuildAttemptClock = () => {
  if (typeof globalThis.performance?.now === "function") {
    return globalThis.performance.now();
  }

  return Date.now();
};

export const createWebsiteBuildAttempt = ({ propertyId, templateKey }) => ({
  attemptId: createWebsiteBuildAttemptId(),
  propertyId,
  templateKey,
  startedAt: getBuildAttemptClock(),
  hasPreviewReadyEvent: false,
  hasTerminalEvent: false,
});

export const getBuildAttemptDurationMs = (startedAt) =>
  Math.max(1, Math.round(getBuildAttemptClock() - Number(startedAt || 0)));

export const waitForNextPaint = () =>
  new Promise((resolve) => {
    const scheduleFrame =
      typeof globalThis.requestAnimationFrame === "function"
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (callback) => globalThis.setTimeout(callback, 0);

    scheduleFrame(() => resolve());
  });
