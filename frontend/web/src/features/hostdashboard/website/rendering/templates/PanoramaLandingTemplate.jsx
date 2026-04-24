import React from "react";
import PropTypes from "prop-types";
import HomeIcon from "@mui/icons-material/Home";
import EventIcon from "@mui/icons-material/Event";
import { GiAirplaneArrival } from "react-icons/gi";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";
import {
  getInteractiveTargetProps,
  TemplateAvailabilityCalendar,
  TemplateHeroCopy,
  TemplateTopBar,
} from "./templateSharedSections";
import {
  amenityPropType,
  availabilityPropType,
  callToActionPropType,
  copyItemPropType,
  galleryPropType,
  heroPropType,
  mediaPropType,
  sitePropType,
  templateInteractionPropTypes,
  visibilityPropType,
} from "./templatePropTypes";

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
        <TemplateTopBar model={model} onSelectTarget={onSelectTarget} activeTargetId={activeTargetId}>
          <div className={styles.templateTopBarNav}>
            <span>Overview</span>
            <span>Amenities</span>
            <span>Contact</span>
          </div>
        </TemplateTopBar>
      ) : null}

      <section className={styles.panoramaIntro}>
        <TemplateHeroCopy
          className={styles.panoramaIntroCopy}
          model={model}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
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
          {model.trustCards.map((card, index) => {
            const iconConfig = getPanoramaCardIcon(card.id);
            const IconComponent = iconConfig?.Icon || null;

            return (
              <article
                key={card.id}
                {...getInteractiveTargetProps(styles.panoramaFeatureCard, onSelectTarget, {
                  sectionId: "trustCards",
                  targetId: `trustCards.${index}`,
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
        <TemplateAvailabilityCalendar
          model={model}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
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
                    key={`${model.site.title}-${index}-${imageUrl}`}
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
    site: sitePropType.isRequired,
    hero: heroPropType.isRequired,
    media: mediaPropType.isRequired,
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
    callToAction: callToActionPropType.isRequired,
    trustCards: PropTypes.arrayOf(copyItemPropType).isRequired,
    gallery: galleryPropType.isRequired,
    amenities: PropTypes.shape({
      featured: PropTypes.arrayOf(amenityPropType).isRequired,
    }).isRequired,
    availability: availabilityPropType.isRequired,
    visibility: visibilityPropType.isRequired,
  }).isRequired,
  ...templateInteractionPropTypes,
};
