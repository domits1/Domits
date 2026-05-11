import React, { useEffect, useMemo, useState } from "react";
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
import WebsiteContactWidget from "./rendering/WebsiteContactWidget";
import { getWebsiteTemplateRenderer } from "./rendering/templateRegistry";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides, resolveWebsiteBackgroundColor } from "./rendering/websiteDraftThemeOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import {
  fetchPublicWebsiteRenderModel,
  fetchPublicWebsiteSiteResolution,
} from "./services/websitePublicSiteService";
import styles from "./WebsitePublicPreviewPage.module.scss";

const normalizeWebsiteDomain = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  const withoutProtocol = normalizedValue.replace(/^https?:\/\//, "");
  const hostSegment = withoutProtocol.split("/")[0] || "";
  return hostSegment.split(":")[0] || "";
};

function WebsitePublicSitePage() {
  const { domain: routeDomain = "" } = useParams();
  const [resolution, setResolution] = useState(null);
  const [renderPayload, setRenderPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
  }, [requestedDomain, requestedSiteId]);

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
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(templateId);
  const canRenderPublishedSite = !loadError && publicModel && TemplateComponent;

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
  }, [canRenderPublishedSite, renderPayload, requestedDomain]);

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
    const shouldShowContactWidget = publicModel.visibility?.chatWidget ?? true;
    const publishedSitePageStyle = {
      "--website-surface-background": resolveWebsiteBackgroundColor(publicModel?.theme?.backgroundColor),
    };

    return (
      <main className={styles.publicPreviewPage} style={publishedSitePageStyle}>
        <div className={styles.publicPreviewCanvas}>
          <TemplateComponent model={publicModel} />
          {shouldShowContactWidget ? <WebsiteContactWidget model={publicModel} /> : null}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.publicPreviewStatePage}>
      <section className={`${styles.publicPreviewStateCard} ${styles.publicPreviewErrorCard}`.trim()}>
        <p className={styles.publicPreviewEyebrow}>Published website</p>
        <h1>{template?.name || "Published website unavailable"}</h1>
        <p>{loadError || "This published website is not available."}</p>
      </section>
    </main>
  );
}

export default WebsitePublicSitePage;
