import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";
import { applyWebsiteDraftThemeOverrides, resolveWebsiteBackgroundColor } from "./rendering/websiteDraftThemeOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import { getWebsiteTemplateRenderer } from "./rendering/templateRegistry";
import { WebsiteTemplateSurface } from "./rendering/WebsiteTemplatePreview";
import { fetchWebsitePreviewByDraftId } from "./services/websitePublicPreviewService";
import { recordPublicWebsiteAnalyticsEventSafely } from "./analytics/websiteAnalyticsService";
import {
  getWebsiteAnalyticsViewport,
  startWebsitePreviewLcpObserver,
} from "./analytics/websitePreviewAnalytics";
import {
  WEBSITE_ANALYTICS_SURFACE_PREVIEW,
  WEBSITE_SITE_LCP_RECORDED_EVENT,
} from "./analytics/websiteAnalyticsEventTypes";
import { subscribeToWebsitePreviewUpdates } from "./services/websitePreviewSync";
import styles from "./WebsitePublicPreviewPage.module.scss";

const getDraftPreviewContentOverrides = (draft) => {
  if (draft?.contentOverrides && typeof draft.contentOverrides === "object") {
    return draft.contentOverrides;
  }

  if (draft?.publishedContentOverrides && typeof draft.publishedContentOverrides === "object") {
    return draft.publishedContentOverrides;
  }

  return {};
};

const getDraftPreviewThemeOverrides = (draft) => {
  if (draft?.themeOverrides && typeof draft.themeOverrides === "object") {
    return draft.themeOverrides;
  }

  if (draft?.publishedThemeOverrides && typeof draft.publishedThemeOverrides === "object") {
    return draft.publishedThemeOverrides;
  }

  return {};
};

function WebsitePublicPreviewPage() {
  const { draftId } = useParams();
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPublicPreview = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const nextPayload = await fetchWebsitePreviewByDraftId(draftId);
        if (!isMounted) {
          return;
        }

        setPayload(nextPayload);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPayload(null);
        setLoadError(error?.message || "We could not load this website preview.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPublicPreview();

    return () => {
      isMounted = false;
    };
  }, [draftId, refreshVersion]);

  useEffect(() => {
    return subscribeToWebsitePreviewUpdates(draftId, () => {
      setRefreshVersion((currentVersion) => currentVersion + 1);
    });
  }, [draftId]);

  const previewModel = useMemo(() => {
    if (!payload?.propertyDetails) {
      return null;
    }

    const baseModel = buildWebsiteTemplateModel({
      propertyDetails: payload.propertyDetails,
      summaryProperty: null,
    });
    const themedModel = applyWebsiteDraftThemeOverrides(baseModel, getDraftPreviewThemeOverrides(payload.draft));

    return applyWebsiteDraftContentOverrides(themedModel, getDraftPreviewContentOverrides(payload.draft));
  }, [payload]);

  const templateId = payload?.draft?.templateKey || "";
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(templateId);
  const canRenderPreview = !loadError && previewModel && TemplateComponent;
  const isPanoramaTemplate = templateId === "panorama-landing";

  useEffect(() => {
    if (!previewModel?.site?.title) {
      return;
    }

    document.title = `${previewModel.site.title} | Domits preview`;
  }, [previewModel?.site?.title]);

  useEffect(() => {
    if (!canRenderPreview || !draftId) {
      return undefined;
    }

    const viewport = getWebsiteAnalyticsViewport();

    return startWebsitePreviewLcpObserver({
      enabled: true,
      onReport: (durationMs) => {
        recordPublicWebsiteAnalyticsEventSafely({
          draftId,
          eventType: WEBSITE_SITE_LCP_RECORDED_EVENT,
          payload: {
            surface: WEBSITE_ANALYTICS_SURFACE_PREVIEW,
            viewport,
            durationMs,
          },
        });
      },
    });
  }, [canRenderPreview, draftId, refreshVersion]);

  if (isLoading) {
    return (
      <main className={styles.publicPreviewStatePage}>
        <section className={styles.publicPreviewStateCard}>
          <PulseBarsLoader message="Loading website preview..." />
        </section>
      </main>
    );
  }

  if (canRenderPreview) {
    const publicPreviewPageStyle = {
      "--website-surface-background": resolveWebsiteBackgroundColor(previewModel?.theme?.backgroundColor),
    };
    const publicPreviewPageClassName = `${styles.publicPreviewPage} ${
      isPanoramaTemplate ? styles.publicPreviewPagePanorama : ""
    }`.trim();
    const publicPreviewCanvasClassName = `${styles.publicPreviewCanvas} ${
      isPanoramaTemplate ? styles.publicPreviewCanvasWide : ""
    } ${isPanoramaTemplate ? styles.publicPreviewCanvasFlush : ""}`.trim();

    return (
      <main className={publicPreviewPageClassName} style={publicPreviewPageStyle}>
        <div className={publicPreviewCanvasClassName}>
          <WebsiteTemplateSurface
            templateId={templateId}
            model={previewModel}
            showContactWidget={previewModel.visibility?.chatWidget ?? true}
            showBrowserChrome={false}
            enableScrollReveal={isPanoramaTemplate}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.publicPreviewStatePage}>
      <section className={`${styles.publicPreviewStateCard} ${styles.publicPreviewErrorCard}`.trim()}>
        <p className={styles.publicPreviewEyebrow}>Website preview</p>
        <h1>{template?.name || "Preview unavailable"}</h1>
        <p>{loadError || "This website preview is not available."}</p>
      </section>
    </main>
  );
}

export default WebsitePublicPreviewPage;
