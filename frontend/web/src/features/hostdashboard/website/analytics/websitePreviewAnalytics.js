import {
  WEBSITE_ANALYTICS_VIEWPORT_DESKTOP,
  WEBSITE_ANALYTICS_VIEWPORT_MOBILE,
  WEBSITE_ANALYTICS_VIEWPORT_TABLET,
} from "./websiteAnalyticsEventTypes";

const getViewportWidth = () => {
  if (typeof globalThis.innerWidth === "number" && globalThis.innerWidth > 0) {
    return globalThis.innerWidth;
  }

  const documentWidth = Number(globalThis.document?.documentElement?.clientWidth || 0);
  return Math.max(0, documentWidth);
};

export const getWebsiteAnalyticsViewport = () => {
  const viewportWidth = getViewportWidth();
  if (viewportWidth > 0 && viewportWidth <= 767) {
    return WEBSITE_ANALYTICS_VIEWPORT_MOBILE;
  }

  if (viewportWidth > 0 && viewportWidth <= 1024) {
    return WEBSITE_ANALYTICS_VIEWPORT_TABLET;
  }

  if (globalThis.navigator?.userAgentData?.mobile === true) {
    return WEBSITE_ANALYTICS_VIEWPORT_MOBILE;
  }

  return WEBSITE_ANALYTICS_VIEWPORT_DESKTOP;
};

export const startWebsitePreviewLcpObserver = ({ enabled, onReport }) => {
  if (!enabled || typeof onReport !== "function") {
    return undefined;
  }

  if (typeof globalThis.PerformanceObserver !== "function") {
    return undefined;
  }

  let latestLargestContentfulPaint = 0;
  let hasReported = false;
  let observer = null;

  const reportLargestContentfulPaint = () => {
    if (hasReported || latestLargestContentfulPaint <= 0) {
      return;
    }

    hasReported = true;
    onReport(Math.round(latestLargestContentfulPaint));
  };

  try {
    observer = new globalThis.PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const latestEntry = entries.at(-1);
      if (latestEntry?.startTime) {
        latestLargestContentfulPaint = latestEntry.startTime;
      }
    });

    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    return undefined;
  }

  const fallbackTimerId = globalThis.setTimeout(reportLargestContentfulPaint, 5000);
  const handlePageHide = () => {
    reportLargestContentfulPaint();
  };
  const handleVisibilityChange = () => {
    if (globalThis.document?.visibilityState === "hidden") {
      reportLargestContentfulPaint();
    }
  };

  globalThis.addEventListener("pagehide", handlePageHide);
  globalThis.document?.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    globalThis.clearTimeout(fallbackTimerId);
    observer?.disconnect();
    globalThis.removeEventListener("pagehide", handlePageHide);
    globalThis.document?.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};
