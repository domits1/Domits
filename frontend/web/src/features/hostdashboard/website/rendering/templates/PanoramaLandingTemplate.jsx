import React from "react";
import PropTypes from "prop-types";
import HomeIcon from "@mui/icons-material/Home";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import { GiAirplaneArrival } from "react-icons/gi";
import styles from "../WebsiteTemplatePreview.module.scss";

const PANORAMA_CARD_ICONS = Object.freeze({
  "stay-details": HomeIcon,
  "arrival-guidelines": GiAirplaneArrival,
  "location-context": CalendarIcon,
});

const getPanoramaCardIcon = (cardId) => PANORAMA_CARD_ICONS[cardId] || null;

export default function PanoramaLandingTemplate({ model }) {
  return (
    <article className={styles.templateSite}>
      <div className={styles.templateTopBar}>
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

      <section className={styles.panoramaIntro}>
        <div className={styles.panoramaIntroCopy}>
          <p className={styles.sectionEyebrow}>{model.hero.eyebrow}</p>
          <h1 className={styles.heroTitle}>{model.hero.title}</h1>
          <p className={styles.heroDescription}>{model.hero.description}</p>
        </div>
      </section>

      <section className={styles.panoramaHeroCard}>
        <img className={styles.panoramaHeroImage} src={model.media.heroImage} alt={model.hero.title} />
        <div className={styles.panoramaSearchStub}>
          <strong>{model.callToAction.label}</strong>
          {model.stay.nightlyRateLabel ? <span>{model.stay.nightlyRateLabel}</span> : null}
        </div>
      </section>

      <section className={styles.panoramaFeatureGrid}>
        {model.trustCards.map((card) => {
          const IconComponent = getPanoramaCardIcon(card.id);

          return (
            <article key={card.id} className={styles.panoramaFeatureCard}>
              {IconComponent ? (
                <IconComponent
                  aria-hidden="true"
                  className={`${styles.panoramaFeatureIcon} ${styles.panoramaFeatureIconGlyph}`}
                />
              ) : (
                <span className={styles.panoramaFeatureIcon} aria-hidden="true" />
              )}
              <p className={styles.panoramaFeatureTitle}>{card.title}</p>
              <p className={styles.panoramaFeatureDescription}>{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Below the fold</p>
          <h2>Imported gallery and amenity context</h2>
        </div>

        <div className={styles.galleryAndAmenities}>
          <div className={styles.galleryStrip}>
            {model.gallery.images.slice(0, 3).map((imageUrl, index) => (
              <img
                key={`${imageUrl}-${index}`}
                className={styles.galleryImage}
                src={imageUrl}
                alt={`${model.hero.title} view ${index + 1}`}
              />
            ))}
          </div>

          <div className={styles.amenityPanel}>
            <p className={styles.panelTitle}>Featured amenities</p>
            <div className={styles.amenityChipGrid}>
              {model.amenities.featured.slice(0, 6).map((amenity) => (
                <span key={amenity.id} className={styles.amenityChip}>
                  {amenity.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

PanoramaLandingTemplate.propTypes = {
  model: PropTypes.shape({
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
  }).isRequired,
};
