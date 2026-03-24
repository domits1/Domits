import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./WebsiteBuilderPage.module.scss";
import { fetchHostPropertySelectOptions } from "../services/hostTaskPropertyService";
import arrowLeftIcon from "../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../images/arrow-right-icon.svg";
import TemplateSilhouette from "./TemplateSilhouette";
import { WEBSITE_TEMPLATE_OPTIONS, getWebsiteTemplateById } from "./websiteTemplates";

const EMPTY_SELECTION = "";
const STEP_SELECT_LISTING = "select-listing";
const STEP_PICK_TEMPLATE = "pick-template";
const PHOTO_CARD_VARIANT_CLASSES = [styles.photoCard1, styles.photoCard2, styles.photoCard3];

const PROPERTY_STATUS_LABELS = {
  ACTIVE: "Live",
  INACTIVE: "Draft",
  ARCHIVED: "Archived",
};

const SUMMARY_DESCRIPTION_WORD_LIMIT = 23;

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

const getPreviewReadySummary = (importedImageCount) => {
  if (importedImageCount < 1) {
    return "No photos imported yet";
  }

  return `${importedImageCount} image${importedImageCount === 1 ? "" : "s"} ready for preview`;
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

const getStepHeaderDescription = (activeStep) => {
  if (activeStep === STEP_SELECT_LISTING) {
    return "Pick the property you want to use as the base for your website. This page only shows listings that belong to your host account.";
  }

  return "The live site can stay stable while you choose the layout direction for this selected listing.";
};

const getGalleryViewAlt = (propertyLabel, activeIndex) => `${propertyLabel} view ${activeIndex + 1}`;

const getPhotoCardClassName = (photoIndex) => {
  const variantClassName = PHOTO_CARD_VARIANT_CLASSES[photoIndex] || "";
  return `${styles.photoCard} ${variantClassName}`.trim();
};


function WebsiteBuilderPage() {
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(EMPTY_SELECTION);
  const [activeStep, setActiveStep] = useState(STEP_SELECT_LISTING);
  const [selectedTemplateId, setSelectedTemplateId] = useState(WEBSITE_TEMPLATE_OPTIONS[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [galleryAnimationDirection, setGalleryAnimationDirection] = useState("idle");
  const [galleryAnimationTick, setGalleryAnimationTick] = useState(0);
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

  useEffect(() => {
    void loadProperties();
  }, []);

  const selectedProperty =
    propertyOptions.find((propertyOption) => propertyOption.value === selectedPropertyId) || null;
  const previewImages = selectedProperty?.previewImages || [];
  const galleryImages = selectedProperty?.galleryImages || previewImages;
  const importedImageCount = selectedProperty?.imageCount || 0;
  const summaryDescription = truncateDescription(selectedProperty?.description);
  const selectedTemplate = getWebsiteTemplateById(selectedTemplateId);
  const activeGalleryImage = galleryImages[activeGalleryIndex] || galleryImages[0] || "";

  useEffect(() => {
    if (!selectedProperty) {
      setActiveStep(STEP_SELECT_LISTING);
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

  const setGalleryImage = (nextIndex, direction = "idle") => {
    setGalleryAnimationDirection(direction);
    setActiveGalleryIndex(nextIndex);
    setGalleryAnimationTick((currentTick) => currentTick + 1);
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

  const renderSelectionState = () => {
    if (isLoading) {
      return <p className={styles.stateText}>Loading your listings...</p>;
    }

    if (loadError) {
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

    if (propertyOptions.length === 0) {
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
          >
            <option value={EMPTY_SELECTION}>Choose a listing</option>
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
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setActiveStep(STEP_PICK_TEMPLATE)}
                  >
                    Proceed
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
    if (!selectedProperty) {
      return null;
    }

    return (
      <div className={styles.templateStage}>
        <div className={styles.stepHeader}>
          <p className={styles.stepEyebrow}>Step 2</p>
          <h2>Choose a website template</h2>
          <p>
            Keep your selected listing as the source, then choose the layout direction that fits the
            kind of guest experience you want to publish first.
          </p>
        </div>

        <div className={styles.selectedListingCard}>
          <div className={styles.selectionPreview}>
            {renderPhotoStack()}

            <div className={styles.selectionContent}>
              <p className={styles.summaryLabel}>Current listing</p>
              <p className={styles.selectedListingTitle}>{selectedProperty.title || selectedProperty.label}</p>
              {selectedProperty.location ? (
                <p className={styles.selectedListingLocation}>{selectedProperty.location}</p>
              ) : null}
              <div className={styles.metaRow}>
                <span className={styles.statusPill}>
                  Status: {getPropertyStatusLabel(selectedProperty.status)}
                </span>
                <span className={styles.metaText}>{getPreviewReadySummary(importedImageCount)}</span>
              </div>
              {summaryDescription ? <p className={styles.summaryMeta}>{summaryDescription}</p> : null}
              <div className={styles.buttonRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => openGallery(0)}>
                  Browse photos
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setActiveStep(STEP_SELECT_LISTING)}
                >
                  Change listing
                </button>
              </div>
            </div>
          </div>
        </div>

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

            <button type="button" className={styles.primaryButton}>
              Build my website
            </button>
          </div>

          <p className={styles.selectedTemplateDescription}>{selectedTemplate.description}</p>
        </div>
      </div>
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
              <h2>{activeStep === STEP_SELECT_LISTING ? "Select your listing" : "Start shaping the website"}</h2>
              <p>
                {getStepHeaderDescription(activeStep)}
              </p>
            </div>

            {activeStep === STEP_SELECT_LISTING ? renderSelectionState() : renderTemplateStep()}
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
