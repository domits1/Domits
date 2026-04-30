export const isMobilePreviewViewport = () => {
  if (globalThis.navigator?.userAgentData?.mobile === true) {
    return true;
  }

  if (typeof globalThis.matchMedia === "function") {
    return globalThis.matchMedia("(max-width: 767px)").matches;
  }

  const viewportWidth = Number(globalThis.innerWidth || 0);
  return viewportWidth > 0 && viewportWidth <= 767;
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
      const latestEntry = entries[entries.length - 1];
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
