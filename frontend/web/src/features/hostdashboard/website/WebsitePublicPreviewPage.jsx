import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import { getWebsiteTemplateRenderer } from "./rendering/templateRegistry";
import WebsiteContactWidget from "./rendering/WebsiteContactWidget";
import { fetchWebsitePreviewByDraftId } from "./services/websitePublicPreviewService";
import { subscribeToWebsitePreviewUpdates } from "./services/websitePreviewSync";
import styles from "./WebsitePublicPreviewPage.module.scss";

const getDraftPublishedContentOverrides = (draft) => {
  if (draft?.publishedContentOverrides && typeof draft.publishedContentOverrides === "object") {
    return draft.publishedContentOverrides;
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

    return applyWebsiteDraftContentOverrides(baseModel, getDraftPublishedContentOverrides(payload.draft));
  }, [payload]);

  const templateId = payload?.draft?.templateKey || "";
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(templateId);

  useEffect(() => {
    if (!previewModel?.site?.title) {
      return;
    }

    document.title = `${previewModel.site.title} | Domits preview`;
  }, [previewModel?.site?.title]);

  if (isLoading) {
    return (
      <main className={styles.publicPreviewStatePage}>
        <section className={styles.publicPreviewStateCard}>
          <PulseBarsLoader message="Loading website preview..." />
        </section>
      </main>
    );
  }

  const canRenderPreview = !loadError && previewModel && TemplateComponent;
  if (canRenderPreview) {
    const shouldShowContactWidget = previewModel.visibility?.chatWidget ?? true;

    return (
      <main className={styles.publicPreviewPage}>
        <div className={styles.publicPreviewCanvas}>
          <TemplateComponent model={previewModel} />
          {shouldShowContactWidget ? <WebsiteContactWidget model={previewModel} /> : null}
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
