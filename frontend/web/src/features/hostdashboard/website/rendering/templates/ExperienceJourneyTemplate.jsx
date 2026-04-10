import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";

export default function ExperienceJourneyTemplate({ model }) {
  return (
    <article className={styles.templateSite}>
      <div className={styles.templateTopBar}>
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

      <section className={styles.experienceIntro}>
        <div className={styles.experienceIntroCopy}>
          <p className={styles.sectionEyebrow}>Experience-led layout</p>
          <h1 className={styles.heroTitle}>{model.hero.title}</h1>
          <p className={styles.heroDescription}>{model.hero.description}</p>
        </div>
      </section>

      <section className={styles.experienceJourneyStack}>
        {model.journeyStops.slice(0, 3).map((stop, index) => {
          const imageUrl = model.gallery.images[index] || model.media.heroImage;
          const isReversed = index % 2 === 1;

          return (
            <article
              key={stop.id}
              className={`${styles.experienceJourneyRow} ${
                isReversed ? styles.experienceJourneyRowReversed : ""
              }`.trim()}
            >
              <div className={styles.experienceJourneyCopy}>
                <p className={styles.journeyLabel}>{stop.title}</p>
                <p>{stop.description}</p>
              </div>
              <img className={styles.experienceJourneyVisual} src={imageUrl} alt={`${stop.title} visual`} />
            </article>
          );
        })}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Imported highlights</p>
          <h2>Featured amenities and next step</h2>
        </div>

        <div className={styles.experienceFooter}>
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

          <div className={styles.softCallout}>
            <strong>{model.callToAction.label}</strong>
            <p>{model.callToAction.note}</p>
          </div>
        </div>
      </section>
    </article>
  );
}

ExperienceJourneyTemplate.propTypes = {
  model: PropTypes.shape({
    hero: PropTypes.shape({
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
    callToAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
      note: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
