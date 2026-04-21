import React from "react";
import PropTypes from "prop-types";
import HomeIcon from "@mui/icons-material/Home";
import EventIcon from "@mui/icons-material/Event";
import { GiAirplaneArrival } from "react-icons/gi";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";
import AvailabilityCalendarPreview from "../AvailabilityCalendarPreview";

const PANORAMA_CARD_ICONS = Object.freeze({
  "stay-details": {
    Icon: HomeIcon,
    glyphClassName: "",
  },
  "arrival-guidelines": {
    Icon: GiAirplaneArrival,
    glyphClassName: styles.panoramaFeatureIconGlyphLarge,
  },
  "location-context": {
    Icon: EventIcon,
    glyphClassName: "",
  },
});

const getPanoramaCardIcon = (cardId) => PANORAMA_CARD_ICONS[cardId] || null;

const getInteractiveTargetProps = (className, onSelectTarget, target, activeTargetId = "") => {
  if (!onSelectTarget) {
    return { className };
  }

  const isActiveTarget = target?.targetId && target.targetId === activeTargetId;
  const handleActivate = () => onSelectTarget(target);
  return {
    className: `${className} ${styles.previewInteractiveTarget} ${
      isActiveTarget ? styles.previewInteractiveTargetActive : ""
    }`.trim(),
    role: "button",
    tabIndex: 0,
    onClick: handleActivate,
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleActivate();
      }
    },
  };
};

export default function PanoramaLandingTemplate({ model, onSelectTarget, activeTargetId }) {
  const showTopBar = model.visibility?.topBar !== false;
  const showTrustCards = model.visibility?.trustCards !== false;
  const showGallerySection = model.visibility?.gallerySection !== false;
  const showAmenitiesPanel = model.visibility?.amenitiesPanel !== false;
  const showAvailabilityCalendar = model.visibility?.availabilityCalendar !== false;
  const showCallToAction = model.visibility?.callToAction !== false;
  const showPanoramaSecondarySection = showGallerySection || showAmenitiesPanel;

  return (
    <article className={styles.templateSite}>
      {showTopBar ? (
        <div
          {...getInteractiveTargetProps(styles.templateTopBar, onSelectTarget, {
            sectionId: "common",
            targetId: "common.siteTitle",
          }, activeTargetId)}
        >
          <div className={styles.templateTopBarBrand}>
            <span className={styles.templateTopBarMark} aria-hidden="true" />
            <span>{model.site.title}</span>
          </div>
          <div className={styles.templateTopBarNav}>
            <span>Overview</span>
            <span>Amenities</span>
            <span>Contact</span>
          </div>
        </div>
      ) : null}

      <section className={styles.panoramaIntro}>
        <div className={styles.panoramaIntroCopy}>
          <p
            {...getInteractiveTargetProps(styles.sectionEyebrow, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroEyebrow",
            }, activeTargetId)}
          >
            {model.hero.eyebrow}
          </p>
          <h1
            {...getInteractiveTargetProps(styles.heroTitle, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroTitle",
            }, activeTargetId)}
          >
            {model.hero.title}
          </h1>
          <p
            {...getInteractiveTargetProps(styles.heroDescription, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroDescription",
            }, activeTargetId)}
          >
            {model.hero.description}
          </p>
        </div>
      </section>

      <section className={styles.panoramaHeroCard}>
        <img
          {...getInteractiveTargetProps(styles.panoramaHeroImage, onSelectTarget, {
            sectionId: "images",
            targetId: "images.hero",
            imageSlot: { kind: "hero" },
          }, activeTargetId)}
          src={model.media.heroImage}
          alt={model.hero.title}
        />
        {showCallToAction ? (
          <div
            {...getInteractiveTargetProps(styles.panoramaSearchStub, onSelectTarget, {
              sectionId: "common",
              targetId: "common.ctaLabel",
            }, activeTargetId)}
          >
            <strong>{model.callToAction.label}</strong>
            {model.stay.nightlyRateLabel ? <span>{model.stay.nightlyRateLabel}</span> : null}
          </div>
        ) : null}
      </section>

      {showTrustCards ? (
        <section className={styles.panoramaFeatureGrid}>
          {model.trustCards.map((card) => {
            const iconConfig = getPanoramaCardIcon(card.id);
            const IconComponent = iconConfig?.Icon || null;

            return (
              <article
                key={card.id}
                {...getInteractiveTargetProps(styles.panoramaFeatureCard, onSelectTarget, {
                  sectionId: "trustCards",
                  targetId: `trustCards.${model.trustCards.findIndex((entry) => entry.id === card.id)}`,
                }, activeTargetId)}
              >
                {IconComponent ? (
                  <span className={styles.panoramaFeatureIcon} aria-hidden="true">
                    <IconComponent
                      className={`${styles.panoramaFeatureIconGlyph} ${iconConfig.glyphClassName || ""}`.trim()}
                    />
                  </span>
                ) : (
                  <span className={styles.panoramaFeatureIcon} aria-hidden="true" />
                )}
                <p className={styles.panoramaFeatureTitle}>{card.title}</p>
                <p className={styles.panoramaFeatureDescription}>{card.description}</p>
              </article>
            );
          })}
        </section>
      ) : null}

      {showAvailabilityCalendar ? (
        <AvailabilityCalendarPreview
          availability={model.availability}
          interactiveTargetProps={getInteractiveTargetProps(styles.availabilityCalendarTarget, onSelectTarget, {
            sectionId: "visibility",
            targetId: "visibility.availabilityCalendar",
          }, activeTargetId)}
        />
      ) : null}

      {showPanoramaSecondarySection ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Below the fold</p>
            <h2>Imported gallery and amenity context</h2>
          </div>

          <div className={styles.galleryAndAmenities}>
            {showGallerySection ? (
              <div className={styles.galleryStrip}>
                {model.gallery.images.slice(0, 3).map((imageUrl, index) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    {...getInteractiveTargetProps(styles.galleryImage, onSelectTarget, {
                      sectionId: "images",
                      targetId: `images.gallery.${index}`,
                      imageSlot: { kind: "gallery", index },
                    }, activeTargetId)}
                    src={imageUrl}
                    alt={`${model.hero.title} view ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}

            {showAmenitiesPanel ? (
              <div className={styles.amenityPanel}>
                <p className={styles.panelTitle}>Featured amenities</p>
                <div className={styles.amenityChipGrid}>
                  {model.amenities.featured.slice(0, 6).map((amenity) => {
                    const amenityIcon = getAmenityIconNode(amenity.id, {
                      className: styles.amenityChipIconGlyph,
                      "aria-hidden": true,
                      focusable: "false",
                      sx: {
                        color: "#314f22",
                        fontSize: 16,
                        padding: 0,
                      },
                    });

                    return (
                      <span key={amenity.id} className={styles.amenityChip}>
                        {amenityIcon ? <span className={styles.amenityChipIcon}>{amenityIcon}</span> : null}
                        <span>{amenity.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}

PanoramaLandingTemplate.propTypes = {
  model: PropTypes.shape({
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
    hero: PropTypes.shape({
      eyebrow: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
    }).isRequired,
    media: PropTypes.shape({
      heroImage: PropTypes.string,
    }).isRequired,
    stay: PropTypes.shape({
      stats: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        })
      ).isRequired,
      nightlyRateLabel: PropTypes.string,
    }).isRequired,
    callToAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
    }).isRequired,
    trustCards: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ).isRequired,
    gallery: PropTypes.shape({
      images: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
    amenities: PropTypes.shape({
      featured: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        })
      ).isRequired,
    }).isRequired,
    availability: PropTypes.shape({
      externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
      syncSummary: PropTypes.string,
      blockedDateSummary: PropTypes.string,
      lastSyncLabel: PropTypes.string,
      nextBlockedLabel: PropTypes.string,
      callout: PropTypes.string,
    }).isRequired,
    visibility: PropTypes.shape({
      topBar: PropTypes.bool,
      trustCards: PropTypes.bool,
      gallerySection: PropTypes.bool,
      amenitiesPanel: PropTypes.bool,
      availabilityCalendar: PropTypes.bool,
      callToAction: PropTypes.bool,
      chatWidget: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
