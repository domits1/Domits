import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";
import {
  getInteractiveTargetProps,
  TemplateAvailabilityCalendar,
  TemplateHeroCopy,
  TemplateSoftCallout,
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

export default function ExperienceJourneyTemplate({ model, onSelectTarget, activeTargetId }) {
  const showTopBar = model.visibility?.topBar !== false;
  const showJourneyStops = model.visibility?.journeyStops !== false;
  const showAmenitiesPanel = model.visibility?.amenitiesPanel !== false;
  const showAvailabilityCalendar = model.visibility?.availabilityCalendar !== false;
  const showCallToAction = model.visibility?.callToAction !== false;
  const showExperienceFooter = showAmenitiesPanel || showCallToAction;

  return (
    <article className={styles.templateSite}>
      {showTopBar ? (
        <TemplateTopBar model={model} onSelectTarget={onSelectTarget} activeTargetId={activeTargetId}>
          <div className={styles.templateTopBarNav}>
            <span>Arrival</span>
            <span>Stay</span>
            <span>Area</span>
          </div>
        </TemplateTopBar>
      ) : null}

      <section className={styles.experienceIntro}>
        <TemplateHeroCopy
          className={styles.experienceIntroCopy}
          model={model}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      </section>

      {showJourneyStops ? (
        <section className={styles.experienceJourneyStack}>
          {model.journeyStops.slice(0, 3).map((stop, index) => {
            const imageUrl = model.gallery.images[index] || model.media.heroImage;
            const isReversed = index % 2 === 1;

            return (
              <article
                key={stop.id}
                {...getInteractiveTargetProps(
                  `${styles.experienceJourneyRow} ${
                    isReversed ? styles.experienceJourneyRowReversed : ""
                  }`.trim(),
                  onSelectTarget,
                  {
                    sectionId: "journeyStops",
                    targetId: `journeyStops.${index}`,
                  },
                  activeTargetId
                )}
              >
                <div className={styles.experienceJourneyCopy}>
                  <p className={styles.journeyLabel}>{stop.title}</p>
                  <p>{stop.description}</p>
                </div>
                <img
                  {...getInteractiveTargetProps(styles.experienceJourneyVisual, onSelectTarget, {
                    sectionId: "images",
                    targetId: `images.gallery.${index}`,
                    imageSlot: { kind: "gallery", index },
                  }, activeTargetId)}
                  src={imageUrl}
                  alt={`${stop.title} visual`}
                />
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

      {showExperienceFooter ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Imported highlights</p>
            <h2>Featured amenities and next step</h2>
          </div>

          <div className={styles.experienceFooter}>
            {showAmenitiesPanel ? (
              <div className={styles.amenityList}>
                {model.amenities.featured.slice(0, 4).map((amenity) => {
                  const amenityIcon = getAmenityIconNode(amenity.id, {
                    className: styles.amenityRowIconGlyph,
                    "aria-hidden": true,
                    focusable: "false",
                    sx: {
                      color: "#314f22",
                      fontSize: 18,
                      padding: 0,
                    },
                  });

                  return (
                    <div key={amenity.id} className={styles.amenityRow}>
                      <div className={styles.amenityRowPrimary}>
                        {amenityIcon ? <span className={styles.amenityRowIcon}>{amenityIcon}</span> : null}
                        <strong>{amenity.label}</strong>
                      </div>
                      <span>{amenity.category}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {showCallToAction ? (
              <TemplateSoftCallout
                className={styles.softCallout}
                model={model}
                onSelectTarget={onSelectTarget}
                activeTargetId={activeTargetId}
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}

ExperienceJourneyTemplate.propTypes = {
  model: PropTypes.shape({
    site: sitePropType.isRequired,
    hero: heroPropType.isRequired,
    journeyStops: PropTypes.arrayOf(copyItemPropType).isRequired,
    gallery: galleryPropType.isRequired,
    media: mediaPropType.isRequired,
    amenities: PropTypes.shape({
      featured: PropTypes.arrayOf(amenityPropType).isRequired,
    }).isRequired,
    availability: availabilityPropType.isRequired,
    callToAction: callToActionPropType.isRequired,
    visibility: visibilityPropType.isRequired,
  }).isRequired,
  ...templateInteractionPropTypes,
};
