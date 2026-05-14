import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { recordPublicWebsiteAnalyticsEventSafely } from "./analytics/websiteAnalyticsService";
import {
  WEBSITE_ANALYTICS_SURFACE_LIVE,
  WEBSITE_SITE_LCP_RECORDED_EVENT,
} from "./analytics/websiteAnalyticsEventTypes";
import {
  getWebsiteAnalyticsViewport,
  startWebsitePreviewLcpObserver,
} from "./analytics/websitePreviewAnalytics";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import { getWebsiteTemplateRenderer } from "./rendering/templateRegistry";
import { WebsiteTemplateSurface } from "./rendering/WebsiteTemplatePreview";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides, resolveWebsiteBackgroundColor } from "./rendering/websiteDraftThemeOverrides";
import {
  fetchPublicWebsiteRenderModel,
  fetchPublicWebsiteSiteResolution,
} from "./services/websitePublicSiteService";
import {
  subscribeToWebsiteLiveSiteUpdates,
  WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE,
} from "./services/websitePreviewSync";
import styles from "./WebsitePublicPreviewPage.module.scss";

const LIVE_SITE_REFRESH_RETRY_INTERVAL_MS = 2000;
const LIVE_SITE_REFRESH_WINDOW_MS = 8000;

const normalizeWebsiteDomain = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  const withoutProtocol = normalizedValue.replace(/^https?:\/\//, "");
  const hostSegment = withoutProtocol.split("/")[0] || "";
  return hostSegment.split(":")[0] || "";
};

const formatWebsiteTitleFromDomain = (domain) => {
  const normalizedDomain = normalizeWebsiteDomain(domain);
  const domainLabel = normalizedDomain.split(".")[0] || "";
  if (!domainLabel) {
    return "";
  }

  const cleanedLabel = domainLabel.replace(/-[a-f0-9]{8,12}$/i, "");
  return cleanedLabel
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const resolveFallbackPropertyId = ({ resolution, renderPayload }) => {
  const candidateValues = [
    resolution?.propertyId,
    renderPayload?.resolution?.propertyId,
    renderPayload?.propertySnapshot?.property?.id,
    renderPayload?.propertySnapshot?.property?.ID,
    renderPayload?.propertySnapshot?.id,
    renderPayload?.propertySnapshot?.ID,
  ];

  const normalizedPropertyId = candidateValues
    .map((value) => String(value || "").trim())
    .find(Boolean);

  return normalizedPropertyId || "";
};

const resolveUnavailableWebsiteTitle = ({ renderPayload, resolution, requestedDomain }) => {
  const candidateTitles = [
    renderPayload?.site?.siteName,
    resolution?.siteName,
    renderPayload?.propertySnapshot?.site?.title,
    renderPayload?.propertySnapshot?.property?.title,
    renderPayload?.propertySnapshot?.property?.name,
  ];

  const resolvedTitle = candidateTitles.map((value) => String(value || "").trim()).find(Boolean);
  if (resolvedTitle) {
    return resolvedTitle;
  }

  return formatWebsiteTitleFromDomain(requestedDomain) || "Published website unavailable";
};

function WebsitePublicSitePage() {
  const { domain: routeDomain = "" } = useParams();
  const [resolution, setResolution] = useState(null);
  const [renderPayload, setRenderPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refreshRetryIntervalRef = useRef(null);
  const refreshRetryTimeoutRef = useRef(null);
  const hasPendingRefreshHintRef = useRef(false);

  const requestedDomain = useMemo(() => {
    const routeRequestedDomain = normalizeWebsiteDomain(routeDomain);
    if (routeRequestedDomain) {
      return routeRequestedDomain;
    }

    return normalizeWebsiteDomain(globalThis.location?.host || "");
  }, [routeDomain]);
  const requestedSiteId = useMemo(() => {
    const searchParameters = new URLSearchParams(globalThis.location?.search || "");
    return String(searchParameters.get("siteId") || "").trim();
  }, [routeDomain]);

  useEffect(() => {
    let isMounted = true;

    const loadPublishedWebsite = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        let nextResolution = null;
        let nextRenderPayload = null;

        if (requestedSiteId) {
          nextRenderPayload = await fetchPublicWebsiteRenderModel({
            siteId: requestedSiteId,
            domain: requestedDomain,
          });
          nextResolution = nextRenderPayload?.resolution || null;
        } else {
          nextResolution = await fetchPublicWebsiteSiteResolution(requestedDomain);
          nextRenderPayload = await fetchPublicWebsiteRenderModel({
            siteId: nextResolution?.siteId,
            domain: requestedDomain,
          });
        }

        if (!isMounted) {
          return;
        }

        setResolution(nextResolution);
        setRenderPayload(nextRenderPayload);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setResolution(null);
        setRenderPayload(null);
        setLoadError(error?.message || "We could not load this published website.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPublishedWebsite();

    return () => {
      isMounted = false;
    };
  }, [requestedDomain, requestedSiteId, refreshVersion]);

  const publicModel = useMemo(() => {
    if (!renderPayload?.propertySnapshot) {
      return null;
    }

    const baseModel = buildWebsiteTemplateModel({
      propertyDetails: renderPayload.propertySnapshot,
      summaryProperty: null,
    });
    const themedModel = applyWebsiteDraftThemeOverrides(baseModel, renderPayload.themeOverrides || {});

    return applyWebsiteDraftContentOverrides(themedModel, renderPayload.contentOverrides || {});
  }, [renderPayload]);

  const templateId = renderPayload?.site?.templateKey || resolution?.templateKey || "";
  const TemplateComponent = getWebsiteTemplateRenderer(templateId);
  const canRenderPublishedSite = !loadError && publicModel && TemplateComponent;
  const isPanoramaTemplate = templateId === "panorama-landing";

  const resolvedSiteId = String(renderPayload?.site?.id || resolution?.siteId || requestedSiteId || "").trim();
  const resolvedDomain = normalizeWebsiteDomain(
    renderPayload?.domain?.domain || resolution?.domain?.domain || requestedDomain
  );
  const fallbackPropertyId = useMemo(
    () => resolveFallbackPropertyId({ resolution, renderPayload }),
    [renderPayload, resolution]
  );
  const recoveryHref = fallbackPropertyId
    ? `/listingdetails?ID=${encodeURIComponent(fallbackPropertyId)}`
    : "/home";
  const recoveryLabel = fallbackPropertyId ? "View listing on Domits" : "Browse stays on Domits";
  const unavailableWebsiteTitle = resolveUnavailableWebsiteTitle({
    renderPayload,
    resolution,
    requestedDomain: resolvedDomain || requestedDomain,
  });

  const clearRefreshRetryWindow = () => {
    if (refreshRetryIntervalRef.current) {
      globalThis.clearInterval(refreshRetryIntervalRef.current);
      refreshRetryIntervalRef.current = null;
    }

    if (refreshRetryTimeoutRef.current) {
      globalThis.clearTimeout(refreshRetryTimeoutRef.current);
      refreshRetryTimeoutRef.current = null;
    }
  };

  const triggerPublishedSiteRefresh = () => {
    setRefreshVersion((currentVersion) => currentVersion + 1);
  };

  const startRefreshRetryWindow = () => {
    clearRefreshRetryWindow();

    if (globalThis.document?.visibilityState === "hidden") {
      hasPendingRefreshHintRef.current = true;
      return;
    }

    hasPendingRefreshHintRef.current = false;
    triggerPublishedSiteRefresh();

    refreshRetryIntervalRef.current = globalThis.setInterval(() => {
      triggerPublishedSiteRefresh();
    }, LIVE_SITE_REFRESH_RETRY_INTERVAL_MS);

    refreshRetryTimeoutRef.current = globalThis.setTimeout(() => {
      clearRefreshRetryWindow();
    }, LIVE_SITE_REFRESH_WINDOW_MS);
  };

  useEffect(() => {
    const unsubscribeStorage = subscribeToWebsiteLiveSiteUpdates(
      {
        siteId: resolvedSiteId,
        domain: resolvedDomain,
      },
      () => {
        startRefreshRetryWindow();
      }
    );

    const handleMessage = (event) => {
      const payload = event?.data;
      if (!payload || payload.type !== WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE) {
        return;
      }

      const payloadSiteId = String(payload.siteId || "").trim();
      const payloadDomain = normalizeWebsiteDomain(payload.domain);
      const matchesSiteId = resolvedSiteId && payloadSiteId === resolvedSiteId;
      const matchesDomain = resolvedDomain && payloadDomain === resolvedDomain;
      if (!matchesSiteId && !matchesDomain) {
        return;
      }

      startRefreshRetryWindow();
    };

    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === "visible" && hasPendingRefreshHintRef.current) {
        startRefreshRetryWindow();
      }
    };

    globalThis.addEventListener("message", handleMessage);
    globalThis.document?.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribeStorage();
      clearRefreshRetryWindow();
      globalThis.removeEventListener("message", handleMessage);
      globalThis.document?.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resolvedDomain, resolvedSiteId]);

  useEffect(() => {
    return () => {
      clearRefreshRetryWindow();
    };
  }, []);

  useEffect(() => {
    if (!publicModel?.site?.title) {
      return;
    }

    document.title = publicModel.site.title;
  }, [publicModel?.site?.title]);

  useEffect(() => {
    const publishedSiteId = String(renderPayload?.site?.id || "").trim();
    if (!canRenderPublishedSite || !publishedSiteId) {
      return undefined;
    }

    const viewport = getWebsiteAnalyticsViewport();

    return startWebsitePreviewLcpObserver({
      enabled: true,
      onReport: (durationMs) => {
        void recordPublicWebsiteAnalyticsEventSafely({
          siteId: publishedSiteId,
          domain: renderPayload?.domain?.domain || requestedDomain,
          eventType: WEBSITE_SITE_LCP_RECORDED_EVENT,
          payload: {
            surface: WEBSITE_ANALYTICS_SURFACE_LIVE,
            viewport,
            durationMs,
          },
        });
      },
    });
  }, [canRenderPublishedSite, renderPayload, requestedDomain, refreshVersion]);

  if (isLoading) {
    return (
      <main className={styles.publicPreviewStatePage}>
        <section className={styles.publicPreviewStateCard}>
          <PulseBarsLoader message="Loading published website..." />
        </section>
      </main>
    );
  }

  if (canRenderPublishedSite) {
    const publishedSitePageStyle = {
      "--website-surface-background": resolveWebsiteBackgroundColor(publicModel?.theme?.backgroundColor),
    };

    return (
      <main className={styles.publicPreviewPage} style={publishedSitePageStyle}>
        <div
          className={`${styles.publicPreviewCanvas} ${
            isPanoramaTemplate ? styles.publicPreviewCanvasWide : ""
          }`.trim()}
        >
          <WebsiteTemplateSurface
            templateId={templateId}
            model={publicModel}
            showContactWidget={publicModel.visibility?.chatWidget ?? true}
            showBrowserChrome={false}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.publicPreviewStatePage}>
      <section className={`${styles.publicPreviewStateCard} ${styles.publicPreviewErrorCard}`.trim()}>
        <p className={styles.publicPreviewEyebrow}>Published website</p>
        <h1 className={styles.publicPreviewErrorTitle}>{unavailableWebsiteTitle}</h1>
        <p className={styles.publicPreviewErrorCopy}>{loadError || "This published website is not available."}</p>
        <div className={styles.publicPreviewActionRow}>
          <button
            type="button"
            className={styles.publicPreviewActionButton}
            onClick={() => {
              globalThis.location.assign(recoveryHref);
            }}
          >
            {recoveryLabel}
          </button>
        </div>
      </section>
    </main>
  );
}

export default WebsitePublicSitePage;
