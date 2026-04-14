import React, { useEffect, useRef, useState } from "react";
import LanguageIcon from "@mui/icons-material/Language";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";
import styles from "./WebsiteBuilderPage.module.scss";
import { fetchHostPropertySelectOptions } from "../services/hostTaskPropertyService";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import arrowLeftIcon from "../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../images/arrow-right-icon.svg";
import TemplateSilhouette from "./TemplateSilhouette";
import { WEBSITE_TEMPLATE_OPTIONS, getWebsiteTemplateById } from "./websiteTemplates";
import WebsiteTemplatePreview from "./rendering/WebsiteTemplatePreview";
import { isWebsiteTemplateImplemented } from "./rendering/templateRegistry";
import {
  PREVIEW_BUILD_STEPS,
  PREVIEW_STAGE,
  runWebsitePreviewBuildWorkflow,
} from "./services/websitePreviewWorkflow";
import { fetchWebsiteDrafts, upsertWebsiteDraft } from "./services/websiteDraftService";
import { fetchWebsitePropertyDetails } from "./services/websitePropertyService";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "./rendering/websiteDraftContentOverrides";

const EMPTY_SELECTION = "";
const PHOTO_CARD_VARIANT_CLASSES = [styles.photoCard1, styles.photoCard2, styles.photoCard3];

const PROPERTY_STATUS_LABELS = {
  ACTIVE: "Live",
  INACTIVE: "Draft",
  ARCHIVED: "Archived",
};

const SUMMARY_DESCRIPTION_WORD_LIMIT = 23;
const WORKSPACE_TAB_BUILDER = "builder";
const WORKSPACE_TAB_WEBSITES = "websites";

const getPropertyStatusLabel = (status) =>
  PROPERTY_STATUS_LABELS[String(status || "").toUpperCase()] || "Unknown";

const truncateDescription = (description, wordLimit = SUMMARY_DESCRIPTION_WORD_LIMIT) => {
  const words = String(description || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= wordLimit) {
    return words.join(" ");
  }

  return `${words.slice(0, wordLimit).join(" ")}...`;
};

const getImportedPhotoSummary = (importedImageCount, emptyLabel = "No photos imported yet") => {
  if (importedImageCount < 1) {
    return emptyLabel;
  }

  return `${importedImageCount} photo${importedImageCount === 1 ? "" : "s"} imported`;
};

const getGalleryAnimationClassName = (direction) => {
  if (direction === "forward") {
    return styles.galleryAnimatedImageForward;
  }

  if (direction === "backward") {
    return styles.galleryAnimatedImageBackward;
  }

  return "";
};

const getGalleryViewAlt = (propertyLabel, activeIndex) => `${propertyLabel} view ${activeIndex + 1}`;

const getPhotoCardClassName = (photoIndex) => {
  const variantClassName = PHOTO_CARD_VARIANT_CLASSES[photoIndex] || "";
  return `${styles.photoCard} ${variantClassName}`.trim();
};

const formatDraftUpdatedAt = (updatedAt) => {
  const parsedValue = Number(updatedAt);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "Unknown update time";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(parsedValue));
  } catch {
    return "Unknown update time";
  }
};

function WebsiteBuilderPage() {
  const [workspaceTab, setWorkspaceTab] = useState(WORKSPACE_TAB_BUILDER);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(EMPTY_SELECTION);
  const [selectedTemplateId, setSelectedTemplateId] = useState(WEBSITE_TEMPLATE_OPTIONS[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [galleryAnimationDirection, setGalleryAnimationDirection] = useState("idle");
  const [galleryAnimationTick, setGalleryAnimationTick] = useState(0);
  const [previewStage, setPreviewStage] = useState(PREVIEW_STAGE.idle);
  const [previewBuildPhase, setPreviewBuildPhase] = useState(PREVIEW_BUILD_STEPS[0].key);
  const [previewModel, setPreviewModel] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [websiteDrafts, setWebsiteDrafts] = useState([]);
  const [isLoadingWebsiteDrafts, setIsLoadingWebsiteDrafts] = useState(true);
  const [websiteDraftsError, setWebsiteDraftsError] = useState("");
  const [websiteDraftPreviewModels, setWebsiteDraftPreviewModels] = useState({});
  const [isPersistingWebsiteDraft, setIsPersistingWebsiteDraft] = useState(false);
  const [persistWebsiteDraftMessage, setPersistWebsiteDraftMessage] = useState("");
  const [persistWebsiteDraftError, setPersistWebsiteDraftError] = useState("");
  const previewSectionRef = useRef(null);
  const navigate = useNavigate();

  const loadProperties = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextPropertyOptions = await fetchHostPropertySelectOptions();
      setPropertyOptions(nextPropertyOptions);
      setSelectedPropertyId((currentPropertyId) =>
        nextPropertyOptions.some((option) => option.value === currentPropertyId)
          ? currentPropertyId
          : EMPTY_SELECTION
      );
    } catch (error) {
      setPropertyOptions([]);
      setSelectedPropertyId(EMPTY_SELECTION);
      setLoadError(error?.message || "We could not load your listings.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHostWebsiteDrafts = async () => {
    setIsLoadingWebsiteDrafts(true);
    setWebsiteDraftsError("");

    try {
      const drafts = await fetchWebsiteDrafts();
      setWebsiteDrafts(drafts);
    } catch (error) {
      setWebsiteDrafts([]);
      setWebsiteDraftsError(error?.message || "We could not load your saved website drafts.");
    } finally {
      setIsLoadingWebsiteDrafts(false);
    }
  };

  useEffect(() => {
    void loadProperties();
    void loadHostWebsiteDrafts();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadWebsiteDraftPreviewModels = async () => {
      if (workspaceTab !== WORKSPACE_TAB_WEBSITES || websiteDrafts.length < 1) {
        if (isMounted) {
          setWebsiteDraftPreviewModels({});
        }
        return;
      }

      const previewEntries = await Promise.all(
        websiteDrafts.map(async (draft) => {
          try {
            const propertyDetails = await fetchWebsitePropertyDetails(draft.propertyId);
            const baseModel = buildWebsiteTemplateModel({
              propertyDetails,
              summaryProperty: null,
            });
            const previewModel = applyWebsiteDraftContentOverrides(baseModel, draft.contentOverrides || {});
            return [draft.propertyId, previewModel];
          } catch {
            return [draft.propertyId, null];
          }
        })
      );

      if (!isMounted) {
        return;
      }

      setWebsiteDraftPreviewModels(
        Object.fromEntries(previewEntries.filter(([, previewModel]) => Boolean(previewModel)))
      );
    };

    void loadWebsiteDraftPreviewModels();

    return () => {
      isMounted = false;
    };
  }, [websiteDrafts, workspaceTab]);

  const selectedProperty =
    propertyOptions.find((propertyOption) => propertyOption.value === selectedPropertyId) || null;
  const previewImages = selectedProperty?.previewImages || [];
  const galleryImages = selectedProperty?.galleryImages || previewImages;
  const importedImageCount = selectedProperty?.imageCount || 0;
  const summaryDescription = truncateDescription(selectedProperty?.description);
  const selectedTemplate = getWebsiteTemplateById(selectedTemplateId);
  const selectedTemplateIsImplemented = isWebsiteTemplateImplemented(selectedTemplateId);
  const activeGalleryImage = galleryImages[activeGalleryIndex] || galleryImages[0] || "";
  const isListingStepComplete = Boolean(selectedProperty);

  useEffect(() => {
    if (!selectedProperty) {
      setIsGalleryOpen(false);
      setActiveGalleryIndex(0);
      setGalleryAnimationDirection("idle");
      setGalleryAnimationTick(0);
      return;
    }

    setActiveGalleryIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(galleryImages.length - 1, 0))
    );
  }, [selectedProperty, galleryImages.length]);

  useEffect(() => {
    setPreviewStage(PREVIEW_STAGE.idle);
    setPreviewModel(null);
    setPreviewError("");
    setPreviewBuildPhase(PREVIEW_BUILD_STEPS[0].key);
    setPersistWebsiteDraftMessage("");
    setPersistWebsiteDraftError("");
  }, [selectedPropertyId]);

  useEffect(() => {
    if (previewStage === PREVIEW_STAGE.idle || !previewSectionRef.current) {
      return;
    }

    previewSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [previewStage]);

  const setGalleryImage = (nextIndex, direction = "idle") => {
    setGalleryAnimationDirection(direction);
    setActiveGalleryIndex(nextIndex);
    setGalleryAnimationTick((currentTick) => currentTick + 1);
  };

  const resetPreviewState = () => {
    setPreviewStage(PREVIEW_STAGE.idle);
    setPreviewModel(null);
    setPreviewError("");
    setPreviewBuildPhase(PREVIEW_BUILD_STEPS[0].key);
    setPersistWebsiteDraftMessage("");
    setPersistWebsiteDraftError("");
  };

  const persistSelectedWebsiteDraft = async () => {
    if (!selectedProperty) {
      return;
    }

    setIsPersistingWebsiteDraft(true);
    setPersistWebsiteDraftMessage("");
    setPersistWebsiteDraftError("");

    try {
      await upsertWebsiteDraft({
        propertyId: selectedProperty.value,
        templateKey: selectedTemplateId,
        status: "DRAFT",
        contentOverrides: {},
        themeOverrides: {},
      });
      setPersistWebsiteDraftMessage("Draft saved to your website workspace.");
      await loadHostWebsiteDrafts();
    } catch (error) {
      setPersistWebsiteDraftError(error?.message || "Preview is ready, but saving the website draft failed.");
    } finally {
      setIsPersistingWebsiteDraft(false);
    }
  };

  const buildWebsitePreview = async () => {
    if (!selectedProperty) {
      return;
    }

    setPreviewStage(PREVIEW_STAGE.loading);
    setPreviewModel(null);
    setPreviewError("");
    setPreviewBuildPhase(PREVIEW_BUILD_STEPS[0].key);

    try {
      const nextPreviewModel = await runWebsitePreviewBuildWorkflow({
        propertyId: selectedProperty.value,
        summaryProperty: selectedProperty,
        onPhaseChange: setPreviewBuildPhase,
      });

      setPreviewModel(nextPreviewModel);
      setPreviewStage(PREVIEW_STAGE.ready);
      await persistSelectedWebsiteDraft();
    } catch (error) {
      setPreviewStage(PREVIEW_STAGE.error);
      setPreviewModel(null);
      setPreviewError(error?.message || "We could not build the selected website preview.");
    }
  };

  useEffect(() => {
    if (!isGalleryOpen) {
      return undefined;
    }

    const documentBody = globalThis.document?.body;
    const previousOverflow = documentBody?.style.overflow ?? "";
    if (documentBody) {
      documentBody.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
      }

      if (event.key === "ArrowLeft" && galleryImages.length > 1) {
        const nextIndex = (activeGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
        setGalleryImage(nextIndex, "backward");
      }

      if (event.key === "ArrowRight" && galleryImages.length > 1) {
        const nextIndex = (activeGalleryIndex + 1) % galleryImages.length;
        setGalleryImage(nextIndex, "forward");
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      if (documentBody) {
        documentBody.style.overflow = previousOverflow;
      }
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGalleryIndex, galleryImages.length, isGalleryOpen]);

  const openGallery = (imageIndex = 0) => {
    if (!selectedProperty || galleryImages.length < 1) {
      return;
    }

    setGalleryAnimationDirection("idle");
    setActiveGalleryIndex(Math.max(0, Math.min(imageIndex, galleryImages.length - 1)));
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryAnimationDirection("idle");
    setIsGalleryOpen(false);
  };

  const browseGallery = (direction) => {
    if (galleryImages.length < 2) {
      return;
    }

    const nextIndex = (activeGalleryIndex + direction + galleryImages.length) % galleryImages.length;
    setGalleryImage(nextIndex, direction < 0 ? "backward" : "forward");
  };

  const openWebsiteDraftEditor = (draft) => {
    const propertyId = String(draft?.propertyId || "").trim();
    if (!propertyId) {
      return;
    }

    navigate(`/hostdashboard/website/${propertyId}`);
  };

  const renderPhotoStack = () => (
    <div className={styles.photoStack}>
      {previewImages.map((imageUrl, index) => (
        <button
          key={`${selectedProperty.value}-${imageUrl}`}
          type="button"
          className={getPhotoCardClassName(index)}
          onClick={() => openGallery(index)}
          aria-label={`Open photo ${index + 1} of ${selectedProperty.title || selectedProperty.label}`}
        >
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className={styles.photoImage}
          />
        </button>
      ))}
    </div>
  );

  const renderWorkspaceTabs = () => (
    <div className={styles.workspaceTabs} role="tablist" aria-label="Website workspace">
      <button
        type="button"
        role="tab"
        aria-selected={workspaceTab === WORKSPACE_TAB_BUILDER}
        className={`${styles.workspaceTabButton} ${
          workspaceTab === WORKSPACE_TAB_BUILDER ? styles.workspaceTabButtonActive : ""
        }`.trim()}
        onClick={() => setWorkspaceTab(WORKSPACE_TAB_BUILDER)}
      >
        Build website
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={workspaceTab === WORKSPACE_TAB_WEBSITES}
        className={`${styles.workspaceTabButton} ${
          workspaceTab === WORKSPACE_TAB_WEBSITES ? styles.workspaceTabButtonActive : ""
        }`.trim()}
        onClick={() => setWorkspaceTab(WORKSPACE_TAB_WEBSITES)}
      >
        My websites
      </button>
    </div>
  );

  const renderWebsiteDraftOverview = () => {
    if (isLoadingWebsiteDrafts) {
      return (
        <div className={styles.stateCard}>
          <PulseBarsLoader message="Loading your saved website drafts..." />
        </div>
      );
    }

    if (websiteDraftsError) {
      return (
        <div className={`${styles.stateCard} ${styles.errorState}`}>
          <p>{websiteDraftsError}</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => void loadHostWebsiteDrafts()}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    if (websiteDrafts.length < 1) {
      return (
        <div className={styles.stateCard}>
          <p>
            You do not have any saved website drafts yet. Build a preview from the builder tab and the
            draft will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.websiteDraftList}>
        {websiteDrafts.map((draft) => {
          const template = getWebsiteTemplateById(draft.templateKey);
          const templateName = template?.name || draft.templateKey || "Unknown template";
          const draftPreviewModel = websiteDraftPreviewModels[draft.propertyId] || null;

          return (
            <article key={draft.id || `${draft.propertyId}-${draft.updatedAt}`} className={styles.websiteDraftCard}>
              <div className={styles.websiteDraftCardHeader}>
                <div className={styles.websiteDraftCardCopy}>
                  <p className={styles.summaryLabel}>Saved website draft</p>
                  <p className={styles.summaryValue}>
                    {draft.propertyTitle || "Untitled listing website"}
                  </p>
                  {draft.location ? <p className={styles.summaryLocation}>{draft.location}</p> : null}
                </div>
                <div className={styles.websiteDraftCardPreview}>
                  {draftPreviewModel ? (
                    <WebsiteTemplatePreview
                      templateId={draft.templateKey}
                      model={draftPreviewModel}
                      variant="compact"
                      viewport="desktop"
                    />
                  ) : (
                    <div className={styles.websiteDraftPreviewPlaceholder}>
                      <PulseBarsLoader message="Loading saved preview..." />
                    </div>
                  )}
                </div>
                <span className={styles.statusPill}>{draft.status || "DRAFT"}</span>
              </div>

              <div className={styles.websiteDraftMetaRow}>
                <span className={styles.metaText}>Template: {templateName}</span>
                <span className={styles.metaText}>Updated: {formatDraftUpdatedAt(draft.updatedAt)}</span>
              </div>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => openWebsiteDraftEditor(draft)}
                >
                  Open editor
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderSelectionState = () => {
    if (loadError && propertyOptions.length === 0) {
      return (
        <div className={`${styles.stateCard} ${styles.errorState}`}>
          <p>{loadError}</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => void loadProperties()}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    const showNoListingsState = isLoading === false && propertyOptions.length === 0;
    if (showNoListingsState) {
      return (
        <div className={styles.stateCard}>
          <p>
            You do not have any listings yet. Create one first, then come back here to start building
            your website.
          </p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/hostonboarding")}>
              Add new accommodation
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="website-property-select">
            Listing
          </label>
          <select
            id="website-property-select"
            className={styles.selectInput}
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            disabled={isLoading}
          >
            <option value={EMPTY_SELECTION}>
              {isLoading ? "Loading your listings..." : "Choose a listing"}
            </option>
            {propertyOptions.map((propertyOption) => (
              <option key={propertyOption.value} value={propertyOption.value}>
                {propertyOption.label}
              </option>
            ))}
          </select>
        </div>

        {selectedProperty ? (
          <div className={styles.selectionSummary}>
            <div className={styles.selectionPreview}>
              {renderPhotoStack()}

              <div className={styles.selectionContent}>
                <p className={styles.summaryLabel}>Selected listing</p>
                <p className={styles.summaryValue}>{selectedProperty.title || selectedProperty.label}</p>
                {selectedProperty.location ? (
                  <p className={styles.summaryLocation}>{selectedProperty.location}</p>
                ) : null}
                <div className={styles.metaRow}>
                  <span className={styles.statusPill}>
                    Status: {getPropertyStatusLabel(selectedProperty.status)}
                  </span>
                  <span className={styles.metaText}>{getImportedPhotoSummary(importedImageCount)}</span>
                </div>
                {summaryDescription ? <p className={styles.summaryMeta}>{summaryDescription}</p> : null}
                <div className={styles.buttonRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => openGallery(0)}>
                    Browse photos
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const renderTemplateStep = () => {
    const showTemplateImplementationHint = selectedTemplateIsImplemented === false;

    return (
      <div className={styles.templateStage}>
        <div className={styles.templateGrid}>
          {WEBSITE_TEMPLATE_OPTIONS.map((templateOption) => {
            const isSelected = templateOption.id === selectedTemplateId;

            return (
              <button
                key={templateOption.id}
                type="button"
                className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ""}`}
                onClick={() => setSelectedTemplateId(templateOption.id)}
                aria-pressed={isSelected}
              >
                <span className={styles.templateRadio} aria-hidden="true">
                  <span className={styles.templateRadioDot} />
                </span>
                {isSelected ? <span className={styles.templateSelectedTag}>Selected</span> : null}
                <div className={styles.templatePreviewShell}>
                  <TemplateSilhouette layout={templateOption.layout} />
                </div>
                <div className={styles.templateCardContent}>
                  <div className={styles.templateCardHeader}>
                    <span className={styles.templateName}>{templateOption.name}</span>
                  </div>
                  <p className={styles.templateDescription}>{templateOption.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className={styles.templateSelectionState}>
          <div className={styles.templateSelectionHeader}>
            <div className={styles.templateSelectionCopy}>
              <p className={styles.summaryLabel}>Current template pick</p>
              <p className={styles.selectedTemplateName}>{selectedTemplate.name}</p>
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void buildWebsitePreview()}
              disabled={!selectedTemplateIsImplemented || previewStage === PREVIEW_STAGE.loading}
            >
              {previewStage === PREVIEW_STAGE.loading ? "Building preview..." : "Build my website"}
            </button>
          </div>

          <p className={styles.selectedTemplateDescription}>{selectedTemplate.description}</p>
          {showTemplateImplementationHint ? (
            <p className={styles.previewHelperText}>
              Real template preview is currently available for Panorama Landing, Trust Signals, and
              Experience Journey. The other template options stay visible so the chooser is not locked to
              one direction.
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  const renderPreviewBuildState = () => (
    <div className={styles.previewBuildCard}>
      <div className={styles.previewBuildVisual}>
        <div className={`${styles.previewBuildSilhouetteShell} ${styles.templatePreviewShell}`}>
          <TemplateSilhouette layout={selectedTemplate.layout} />
        </div>
      </div>

      <div className={styles.previewBuildCopy}>
        <PulseBarsLoader
          message={`Preparing ${selectedTemplate.name} from the selected listing`}
          className={styles.previewLoader}
        />

        <div className={styles.previewBuildSteps}>
          {PREVIEW_BUILD_STEPS.map((step, index) => {
            const activeStepIndex = PREVIEW_BUILD_STEPS.findIndex(
              (buildStep) => buildStep.key === previewBuildPhase
            );
            const isComplete = index < activeStepIndex;
            const isActive = index === activeStepIndex;

            return (
              <article
                key={step.key}
                className={`${styles.previewBuildStep} ${isComplete ? styles.previewBuildStepComplete : ""} ${
                  isActive ? styles.previewBuildStepActive : ""
                }`.trim()}
              >
                <span className={styles.previewBuildStepIndex} aria-hidden="true">
                  {index + 1}
                </span>
                <div className={styles.previewBuildStepCopy}>
                  <p>{step.title}</p>
                  <span>{step.description}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (previewStage === PREVIEW_STAGE.idle) {
      return null;
    }

    return (
      <section ref={previewSectionRef} className={styles.builderStepSection}>
        <div className={styles.stepHeader}>
          <p className={styles.stepEyebrow}>Step 3</p>
          <h2>Preview your website</h2>
          <p>
            This stage uses the selected listing detail response and maps it into a shared content model
            before rendering the chosen template.
          </p>
        </div>

        {previewStage === PREVIEW_STAGE.loading ? renderPreviewBuildState() : null}

        {previewStage === PREVIEW_STAGE.error ? (
          <div className={`${styles.stateCard} ${styles.errorState}`}>
            <p>{previewError}</p>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} onClick={() => void buildWebsitePreview()}>
                Try preview again
              </button>
              <button type="button" className={styles.secondaryButton} onClick={resetPreviewState}>
                Back to template chooser
              </button>
            </div>
          </div>
        ) : null}

        {previewStage === PREVIEW_STAGE.ready && previewModel ? (
          <div className={styles.previewReadyState}>
            <div className={styles.previewStageActions}>
              <div className={styles.previewStageMessageStack}>
                <span className={styles.previewHelperText}>
                  Change the selected template above to compare other implemented layouts against the same
                  imported listing data.
                </span>
                {isPersistingWebsiteDraft ? (
                  <span className={styles.previewHelperText}>Saving website draft to your workspace...</span>
                ) : null}
                {persistWebsiteDraftMessage ? (
                  <span className={styles.previewPersistSuccessText}>{persistWebsiteDraftMessage}</span>
                ) : null}
                {persistWebsiteDraftError ? (
                  <span className={styles.previewPersistErrorText}>{persistWebsiteDraftError}</span>
                ) : null}
              </div>
              <div className={styles.buttonRow}>
                <button type="button" className={styles.secondaryButton} onClick={resetPreviewState}>
                  Back to chooser
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigate(`/hostdashboard/website/${selectedProperty.value}`)}
                  disabled={isPersistingWebsiteDraft || Boolean(persistWebsiteDraftError)}
                >
                  Open editor
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => void buildWebsitePreview()}>
                  Refresh preview
                </button>
              </div>
            </div>

            <WebsiteTemplatePreview templateId={selectedTemplateId} model={previewModel} />
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.websitePage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Standalone property website</p>
            <h1 className={styles.heroTitle}>Build your own free website for one of your listings</h1>
            <p className={styles.heroDescription}>
              Choose one of your Domits listings to start a standalone website. We use the property
              information you already manage in Domits, so the website setup begins from real listing data
              instead of manual re-entry.
            </p>
          </div>

          <div className={styles.selectorCard}>
            <div className={styles.selectorHeader}>
              <div className={styles.stepTitleRow}>
                <span className={styles.titleIconBadge} aria-hidden="true">
                  <LanguageIcon className={styles.titleIcon} />
                </span>
                <h2>Configure your website</h2>
              </div>
              <p>
                Your website starts from the property data you already manage in Domits. Title,
                description, photos, and other core listing details are imported directly into the new
                site, so you can assemble your site without any technical knowledge.
              </p>
            </div>

            {renderWorkspaceTabs()}

            {workspaceTab === WORKSPACE_TAB_BUILDER ? (
              <div className={styles.builderSteps}>
                <section className={styles.builderStepSection}>
                  <div className={styles.stepHeader}>
                    <p className={styles.stepEyebrow}>Step 1</p>
                    <div className={styles.stepTitleRow}>
                      <span className={styles.titleIconBadge} aria-hidden="true">
                        <HomeIcon className={styles.titleIcon} />
                      </span>
                      <h2>Choose your listing</h2>
                    </div>
                    <p>
                      Pick the property you want to use as the base for your website. This page only
                      shows listings that belong to your host account.
                    </p>
                  </div>

                  {renderSelectionState()}
                </section>

                {isListingStepComplete ? (
                  <>
                    <section className={styles.builderStepSection}>
                      <div className={styles.stepHeader}>
                        <p className={styles.stepEyebrow}>Step 2</p>
                        <h2>Choose a website template</h2>
                        <p>
                          Select the layout direction you want to use for the listing website. You can keep
                          adjusting the listing choice above while you compare template options.
                        </p>
                      </div>

                      {renderTemplateStep()}
                    </section>

                    {renderPreviewStep()}
                  </>
                ) : null}
              </div>
            ) : (
              <section className={styles.builderStepSection}>
                <div className={styles.stepHeader}>
                  <p className={styles.stepEyebrow}>Website workspace</p>
                  <h2>Saved websites</h2>
                  <p>
                    These are your persisted website drafts. Open any draft to move into the dedicated
                    editor page and continue adjusting your website's content there.
                  </p>
                </div>

                {renderWebsiteDraftOverview()}
              </section>
            )}
          </div>
        </section>
      </div>

      {isGalleryOpen && selectedProperty ? (
        <dialog
          open
          className="image-overlay"
          aria-label="Listing gallery"
          onCancel={(event) => {
            event.preventDefault();
            closeGallery();
          }}
        >
          <button
            type="button"
            className="close-overlay-button"
            onClick={closeGallery}
            aria-label="Close image gallery"
          >
            X
          </button>

          <div className="overlay-center-wrapper">
            <button
              type="button"
              className="nav-button left"
              onClick={() => browseGallery(-1)}
              disabled={galleryImages.length < 2}
              aria-label="Show previous image"
            >
              <img src={arrowLeftIcon} alt="" aria-hidden="true" className={styles.galleryNavIcon} />
            </button>

            <div className={styles.galleryImageViewport}>
              <img
                key={`gallery-image-${activeGalleryIndex}-${galleryAnimationTick}`}
                className={`overlay-main-image ${styles.galleryAnimatedImage} ${getGalleryAnimationClassName(
                  galleryAnimationDirection
                )}`.trim()}
                src={activeGalleryImage}
                alt={getGalleryViewAlt(selectedProperty.title || selectedProperty.label, activeGalleryIndex)}
              />
            </div>

            <button
              type="button"
              className="nav-button right"
              onClick={() => browseGallery(1)}
              disabled={galleryImages.length < 2}
              aria-label="Show next image"
            >
              <img src={arrowRightIcon} alt="" aria-hidden="true" className={styles.galleryNavIcon} />
            </button>
          </div>

          <div className="overlay-thumbnails">
            {galleryImages.map((imageUrl, index) => (
              <button
                key={`${selectedProperty.value}-gallery-${imageUrl}`}
                type="button"
                className={`${index === activeGalleryIndex ? "thumb active" : "thumb"} ${styles.galleryThumbnailButton}`}
                onClick={() => {
                  if (index === activeGalleryIndex) {
                    return;
                  }

                  setGalleryImage(index, index > activeGalleryIndex ? "forward" : "backward");
                }}
                aria-label={`Show gallery item ${index + 1} for ${selectedProperty.title || selectedProperty.label}`}
              >
                <img
                  src={imageUrl}
                  alt=""
                  aria-hidden="true"
                  className={styles.galleryThumbnailImage}
                />
              </button>
            ))}
          </div>
        </dialog>
      ) : null}
    </main>
  );
}

export default WebsiteBuilderPage;
