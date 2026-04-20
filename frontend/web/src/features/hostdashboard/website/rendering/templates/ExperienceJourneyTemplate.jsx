import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";
import AvailabilityCalendarPreview from "../AvailabilityCalendarPreview";

const getInteractiveTargetProps = (className, onSelectTarget, target) => {
  if (!onSelectTarget) {
    return { className };
  }

  const handleActivate = () => onSelectTarget(target);
  return {
    className: `${className} ${styles.previewInteractiveTarget}`.trim(),
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

export default function ExperienceJourneyTemplate({ model, onSelectTarget }) {
  const showTopBar = model.visibility?.topBar !== false;
  const showJourneyStops = model.visibility?.journeyStops !== false;
  const showAmenitiesPanel = model.visibility?.amenitiesPanel !== false;
  const showAvailabilityCalendar = model.visibility?.availabilityCalendar !== false;
  const showCallToAction = model.visibility?.callToAction !== false;
  const showExperienceFooter = showAmenitiesPanel || showCallToAction;

  return (
    <article className={styles.templateSite}>
      {showTopBar ? (
        <div
          {...getInteractiveTargetProps(styles.templateTopBar, onSelectTarget, {
            sectionId: "common",
            targetId: "common.siteTitle",
          })}
        >
          <div className={styles.templateTopBarBrand}>
            <span className={styles.templateTopBarMark} aria-hidden="true" />
            <span>{model.site.title}</span>
          </div>
          <div className={styles.templateTopBarNav}>
            <span>Arrival</span>
            <span>Stay</span>
            <span>Area</span>
          </div>
        </div>
      ) : null}

      <section className={styles.experienceIntro}>
        <div className={styles.experienceIntroCopy}>
          <p
            {...getInteractiveTargetProps(styles.sectionEyebrow, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroEyebrow",
            })}
          >
            {model.hero.eyebrow}
          </p>
          <h1
            {...getInteractiveTargetProps(styles.heroTitle, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroTitle",
            })}
          >
            {model.hero.title}
          </h1>
          <p
            {...getInteractiveTargetProps(styles.heroDescription, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroDescription",
            })}
          >
            {model.hero.description}
          </p>
        </div>
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
                  }
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
                  })}
                  src={imageUrl}
                  alt={`${stop.title} visual`}
                />
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
          })}
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
              <div
                {...getInteractiveTargetProps(styles.softCallout, onSelectTarget, {
                  sectionId: "common",
                  targetId: "common.ctaLabel",
                })}
              >
                <strong>{model.callToAction.label}</strong>
                <p>{model.callToAction.note}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}

ExperienceJourneyTemplate.propTypes = {
  model: PropTypes.shape({
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
    hero: PropTypes.shape({
      eyebrow: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
    }).isRequired,
    journeyStops: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ).isRequired,
    gallery: PropTypes.shape({
      images: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
    media: PropTypes.shape({
      heroImage: PropTypes.string,
    }).isRequired,
    amenities: PropTypes.shape({
      featured: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          category: PropTypes.string.isRequired,
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
    callToAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
      note: PropTypes.string.isRequired,
    }).isRequired,
    visibility: PropTypes.shape({
      topBar: PropTypes.bool,
      amenitiesPanel: PropTypes.bool,
      availabilityCalendar: PropTypes.bool,
      callToAction: PropTypes.bool,
      journeyStops: PropTypes.bool,
      chatWidget: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
};
