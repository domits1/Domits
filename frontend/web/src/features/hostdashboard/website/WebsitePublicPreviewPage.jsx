import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import { getWebsiteTemplateRenderer } from "./rendering/templateRegistry";
import WebsiteContactWidget from "./rendering/WebsiteContactWidget";
import { fetchWebsitePreviewByDraftId } from "./services/websitePublicPreviewService";
import styles from "./WebsitePublicPreviewPage.module.scss";

const getDraftContentOverrides = (draft) =>
  draft?.contentOverrides && typeof draft.contentOverrides === "object" ? draft.contentOverrides : {};

function WebsitePublicPreviewPage() {
  const { draftId } = useParams();
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
  }, [draftId]);

  const previewModel = useMemo(() => {
    if (!payload?.propertyDetails) {
      return null;
    }

    const baseModel = buildWebsiteTemplateModel({
      propertyDetails: payload.propertyDetails,
      summaryProperty: null,
    });

    return applyWebsiteDraftContentOverrides(baseModel, getDraftContentOverrides(payload.draft));
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

  if (loadError || !previewModel || !TemplateComponent) {
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

  return (
    <main className={styles.publicPreviewPage}>
      <div className={styles.publicPreviewCanvas}>
        <TemplateComponent model={previewModel} />
        {previewModel.visibility?.chatWidget !== false ? <WebsiteContactWidget model={previewModel} /> : null}
      </div>
    </main>
  );
}

export default WebsitePublicPreviewPage;
