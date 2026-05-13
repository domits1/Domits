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

const getCurrentPerformanceTimestamp = () => {
  if (globalThis.performance && typeof globalThis.performance.now === "function") {
    return globalThis.performance.now();
  }

  return Date.now();
};

const scheduleReportAfterPaint = (callback) => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        callback();
      });
    });
    return;
  }

  globalThis.setTimeout(callback, 0);
};

const attachImageReadyFallback = (fallbackTargetNode, onReady) => {
  if (!fallbackTargetNode || fallbackTargetNode.tagName !== "IMG") {
    return undefined;
  }

  const imageNode = fallbackTargetNode;
  const triggerReady = () => {
    scheduleReportAfterPaint(() => {
      onReady(getCurrentPerformanceTimestamp());
    });
  };

  if (imageNode.complete && imageNode.naturalWidth > 0) {
    triggerReady();
    return undefined;
  }

  imageNode.addEventListener("load", triggerReady, { once: true });
  imageNode.addEventListener("error", triggerReady, { once: true });

  return () => {
    imageNode.removeEventListener("load", triggerReady);
    imageNode.removeEventListener("error", triggerReady);
  };
};

const attachDocumentReadyFallback = (onReady) => {
  const triggerReady = () => {
    scheduleReportAfterPaint(() => {
      onReady(getCurrentPerformanceTimestamp());
    });
  };

  if (globalThis.document?.readyState === "complete") {
    triggerReady();
    return undefined;
  }

  globalThis.addEventListener("load", triggerReady, { once: true });
  return () => {
    globalThis.removeEventListener("load", triggerReady);
  };
};

export const startWebsitePreviewLcpObserver = ({ enabled, onReport, fallbackTargetSelector = "img" }) => {
  if (!enabled || typeof onReport !== "function") {
    return undefined;
  }

  let latestLargestContentfulPaint = 0;
  let hasReported = false;
  let observer = null;
  let removeFallbackImageListener;
  let removeDocumentReadyFallback;
  const fallbackTargetNode =
    typeof globalThis.document?.querySelector === "function"
      ? globalThis.document.querySelector(fallbackTargetSelector)
      : null;

  const reportLargestContentfulPaint = (fallbackDurationMs = 0) => {
    if (hasReported) {
      return;
    }

    const measuredDurationMs =
      latestLargestContentfulPaint > 0 ? latestLargestContentfulPaint : Number(fallbackDurationMs || 0);
    if (measuredDurationMs <= 0) {
      return;
    }

    hasReported = true;
    onReport(Math.round(measuredDurationMs));
  };

  if (typeof globalThis.PerformanceObserver === "function") {
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
      observer = null;
    }
  }

  removeFallbackImageListener = attachImageReadyFallback(fallbackTargetNode, reportLargestContentfulPaint);
  removeDocumentReadyFallback = attachDocumentReadyFallback(reportLargestContentfulPaint);

  const fallbackTimerId = globalThis.setTimeout(() => {
    reportLargestContentfulPaint(getCurrentPerformanceTimestamp());
  }, 3000);
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
    removeFallbackImageListener?.();
    removeDocumentReadyFallback?.();
    globalThis.removeEventListener("pagehide", handlePageHide);
    globalThis.document?.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};
