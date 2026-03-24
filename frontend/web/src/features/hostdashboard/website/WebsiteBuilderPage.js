import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./WebsiteBuilderPage.module.scss";
import { fetchHostPropertySelectOptions } from "../services/hostTaskPropertyService";
import arrowLeftIcon from "../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../images/arrow-right-icon.svg";

const EMPTY_SELECTION = "";
const STEP_SELECT_LISTING = "select-listing";
const STEP_PICK_TEMPLATE = "pick-template";

const PROPERTY_STATUS_LABELS = {
  ACTIVE: "Live",
  INACTIVE: "Draft",
  ARCHIVED: "Archived",
};

const TEMPLATE_OPTIONS = [
  {
    id: "panorama-landing",
    name: "Panorama Landing",
    description: "Large hero image with fast trust signals and a guided booking call-to-action.",
    layout: "panorama",
  },
  {
    id: "feature-stack",
    name: "Feature Stack",
    description: "A landing page with quick checks, value blocks, and a simple flow down the page.",
    layout: "featureStack",
  },
  {
    id: "editorial-split",
    name: "Editorial Split",
    description: "Story-led content on the left with a visual property showcase on the right.",
    layout: "editorial",
  },
  {
    id: "gallery-grid",
    name: "Gallery Grid",
    description: "Photo-first browsing with a clean grid for guests who compare on visuals.",
    layout: "galleryGrid",
  },
  {
    id: "contact-focus",
    name: "Contact Focus",
    description: "Balanced content sections with a strong footer action for direct guest contact.",
    layout: "contactFocus",
  },
  {
    id: "quote-spotlight",
    name: "Quote Spotlight",
    description: "A booking-led layout with a visible quote panel for guests ready to decide faster.",
    layout: "quoteSpotlight",
  },
];

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

const getTemplateById = (templateId) =>
  TEMPLATE_OPTIONS.find((templateOption) => templateOption.id === templateId) || TEMPLATE_OPTIONS[0];

function TemplateSilhouette({ layout }) {
  switch (layout) {
    case "featureStack":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasFeatureStack}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <div className={styles.templateNavDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateFeatureStackRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={styles.templateFeatureStackCard}>
                <span className={styles.templateMiniIcon} />
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
              </div>
            ))}
          </div>
        </div>
      );
    case "editorial":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasEditorial}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <div className={styles.templateRightMeta}>
              <span className={styles.templateTinyLine} />
              <span className={styles.templateTinyLine} />
            </div>
          </div>
          <div className={styles.templateEditorialBody}>
            <div className={styles.templateEditorialCopy}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateButtonStub} />
            </div>
            <div className={styles.templateEditorialVisual} />
          </div>
          <div className={styles.templateEditorialFooter}>
            <span className={styles.templateLineShort} />
            <span className={styles.templateLineShort} />
            <span className={styles.templateLineShort} />
          </div>
        </div>
      );
    case "galleryGrid":
      return (
        <div className={`${styles.templateCanvas} ${styles.templateCanvasGalleryGrid}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <span className={styles.templateTinyLine} />
          </div>
          <div className={styles.templateGalleryGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={styles.templateGalleryTile}>
                <div className={styles.templateGalleryVisual} />
                <span className={styles.templateLineShort} />
                <span className={styles.templateTinyLine} />
              </div>
            ))}
          </div>
        </div>
      );
      case "contactFocus":
        return (
          <div className={`${styles.templateCanvas} ${styles.templateCanvasContactFocus}`} aria-hidden="true">
            <div className={styles.templateChrome}>
              <span className={styles.templateBrandMark} />
            <div className={styles.templateNavDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.templateContactColumns}>
            <div className={styles.templateContactPanel}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateLineWide} />
            </div>
            <div className={styles.templateContactPanel}>
              <span className={styles.templateLineWide} />
              <span className={styles.templateLineShort} />
              <span className={styles.templateLineShort} />
            </div>
          </div>
            <div className={styles.templateContactFooter}>
              <span className={styles.templateButtonStub} />
            </div>
          </div>
        );
      case "quoteSpotlight":
        return (
          <div className={`${styles.templateCanvas} ${styles.templateCanvasQuoteSpotlight}`} aria-hidden="true">
            <div className={styles.templateChrome}>
              <span className={styles.templateBrandMark} />
              <div className={styles.templateRightMeta}>
                <span className={styles.templateTinyLine} />
                <span className={styles.templateTinyLine} />
              </div>
            </div>
            <div className={styles.templateHeroBand} />
            <div className={styles.templateQuoteSpotlightBody}>
              <div className={styles.templateQuoteCopy}>
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
                <div className={styles.templateQuoteSignalGroup}>
                  <span className={styles.templateTinyLine} />
                  <span className={styles.templateTinyLine} />
                  <span className={styles.templateTinyLine} />
                </div>
              </div>
              <div className={styles.templateQuotePanel}>
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
                <span className={styles.templateLineShort} />
                <span className={styles.templateButtonStub} />
              </div>
            </div>
          </div>
        );
      case "panorama":
      default:
        return (
          <div className={`${styles.templateCanvas} ${styles.templateCanvasPanorama}`} aria-hidden="true">
          <div className={styles.templateChrome}>
            <span className={styles.templateBrandMark} />
            <div className={styles.templateNavDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.templateHeroBand} />
          <div className={styles.templateSearchStub} />
          <div className={styles.templateFeatureRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={styles.templateFeatureCard}>
                <span className={styles.templateMiniIcon} />
                <span className={styles.templateLineWide} />
                <span className={styles.templateLineShort} />
              </div>
            ))}
          </div>
        </div>
      );
  }
}

function WebsiteBuilderPage() {
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(EMPTY_SELECTION);
  const [activeStep, setActiveStep] = useState(STEP_SELECT_LISTING);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_OPTIONS[0].id);
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
  const selectedTemplate = getTemplateById(selectedTemplateId);
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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
          key={`${selectedProperty.value}-${index}`}
          type="button"
          className={`${styles.photoCard} ${styles[`photoCard${index + 1}`] || ""}`}
          onClick={() => openGallery(index)}
          aria-label={`Open photo ${index + 1} of ${selectedProperty.title || selectedProperty.label}`}
        >
          <img
            src={imageUrl}
            alt={`${selectedProperty.title || selectedProperty.label} preview ${index + 1}`}
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
                  <span className={styles.metaText}>
                    {importedImageCount > 0
                      ? `${importedImageCount} photo${importedImageCount === 1 ? "" : "s"} imported`
                      : "No photos imported yet"}
                  </span>
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
          <button
            type="button"
            className={styles.selectedListingMedia}
            onClick={() => openGallery(0)}
            aria-label={`Browse photos for ${selectedProperty.title || selectedProperty.label}`}
          >
            <img
              src={galleryImages[0]}
              alt={selectedProperty.title || selectedProperty.label}
              className={styles.selectedListingImage}
            />
          </button>

          <div className={styles.selectedListingBody}>
            <p className={styles.summaryLabel}>Current listing</p>
            <p className={styles.selectedListingTitle}>{selectedProperty.title || selectedProperty.label}</p>
            {selectedProperty.location ? (
              <p className={styles.selectedListingLocation}>{selectedProperty.location}</p>
            ) : null}
            <div className={styles.metaRow}>
              <span className={styles.statusPill}>
                Status: {getPropertyStatusLabel(selectedProperty.status)}
              </span>
              <span className={styles.metaText}>
                {importedImageCount > 0
                  ? `${importedImageCount} image${importedImageCount === 1 ? "" : "s"} ready for preview`
                  : "No photos imported yet"}
              </span>
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

        <div className={styles.templateGrid}>
          {TEMPLATE_OPTIONS.map((templateOption) => {
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
                {activeStep === STEP_SELECT_LISTING
                  ? "Pick the property you want to use as the base for your website. This page only shows listings that belong to your host account."
                  : "The live site can stay stable while you choose the layout direction for this selected listing."}
              </p>
            </div>

            {activeStep === STEP_SELECT_LISTING ? renderSelectionState() : renderTemplateStep()}
          </div>
        </section>
      </div>

      {isGalleryOpen && selectedProperty ? (
        <div className="image-overlay" role="dialog" aria-modal="true" aria-label="Listing gallery">
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
                className={`overlay-main-image ${styles.galleryAnimatedImage} ${
                  galleryAnimationDirection === "forward"
                    ? styles.galleryAnimatedImageForward
                    : galleryAnimationDirection === "backward"
                    ? styles.galleryAnimatedImageBackward
                    : ""
                }`}
                src={activeGalleryImage}
                alt={`${selectedProperty.title || selectedProperty.label} image ${activeGalleryIndex + 1}`}
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
              <img
                key={`${selectedProperty.value}-gallery-${index}`}
                className={index === activeGalleryIndex ? "thumb active" : "thumb"}
                src={imageUrl}
                alt={`${selectedProperty.title || selectedProperty.label} thumbnail ${index + 1}`}
                onClick={() => {
                  if (index === activeGalleryIndex) {
                    return;
                  }

                  setGalleryImage(index, index > activeGalleryIndex ? "forward" : "backward");
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default WebsiteBuilderPage;
