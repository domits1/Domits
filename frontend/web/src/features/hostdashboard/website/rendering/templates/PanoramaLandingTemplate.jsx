import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getScrollRevealProps } from "../animations/scrollRevealProps";
import { getAmenityIconNode } from "../amenityIconRegistry";
import {
  getInteractiveTargetProps,
  getPreviewTargetMarkerProps,
  TemplateAvailabilityCalendar,
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

const PANORAMA_NAV_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#gallery", label: "Gallery" },
  { href: "#features", label: "Amenities" },
  { href: "#availability", label: "Availability" },
  { href: "#contact", label: "Contact" },
];

const renderPanoramaNavItem = ({ href, label }, isInteractivePreview) => {
  if (isInteractivePreview) {
    return <span key={href}>{label}</span>;
  }

  return (
    <a key={href} href={href}>
      {label}
    </a>
  );
};

const buildPanoramaGallerySlots = (model) => {
  const galleryImages = Array.isArray(model.gallery?.images) ? model.gallery.images.filter(Boolean) : [];

  if (galleryImages.length > 0) {
    return galleryImages.slice(0, 5).map((imageUrl, index) => ({
      imageUrl,
      key: `${model.site.title}-${index}-${imageUrl}`,
      alt: `${model.hero.title} view ${index + 1}`,
      target: {
        sectionId: "images",
        targetId: `images.gallery.${index}`,
        imageSlot: { kind: "gallery", index },
      },
    }));
  }

  const heroImage = String(model.media?.heroImage || "").trim();
  if (!heroImage) {
    return [];
  }

  return [
    {
      imageUrl: heroImage,
      key: `${model.site.title}-hero-fallback`,
      alt: model.hero.title,
      target: {
        sectionId: "images",
        targetId: "images.hero",
        imageSlot: { kind: "hero" },
      },
    },
  ];
};

const buildResidenceVisual = (gallerySlots, model) => {
  const firstGallerySlot = gallerySlots[0];
  if (firstGallerySlot) {
    return firstGallerySlot;
  }

  return {
    imageUrl: model.media.heroImage,
    key: `${model.site.title}-residence-hero`,
    alt: model.hero.title,
    target: {
      sectionId: "images",
      targetId: "images.hero",
      imageSlot: { kind: "hero" },
    },
  };
};

const buildPanoramaViewState = (model) => ({
  showTopBar: model.visibility?.topBar !== false,
  showTrustCards: model.visibility?.trustCards !== false,
  showGallerySection: model.visibility?.gallerySection !== false,
  showAmenitiesPanel: model.visibility?.amenitiesPanel !== false,
  showAvailabilityCalendar: model.visibility?.availabilityCalendar !== false,
  showCallToAction: model.visibility?.callToAction !== false,
  showJourneyStops: model.visibility?.journeyStops !== false,
  gallerySlots: buildPanoramaGallerySlots(model),
  heroStats: Array.isArray(model.stay?.stats) ? model.stay.stats.slice(0, 4) : [],
  featuredTrustCards: Array.isArray(model.trustCards) ? model.trustCards.slice(0, 3) : [],
  featuredAmenities: Array.isArray(model.amenities?.featured) ? model.amenities.featured.slice(0, 8) : [],
  featuredJourneyStops: Array.isArray(model.journeyStops) ? model.journeyStops.slice(0, 3) : [],
  featuredPolicies: Array.isArray(model.policies?.featured) ? model.policies.featured.slice(0, 4) : [],
  residenceMeta: [
    model.stay?.nightlyRateLabel,
    model.stay?.minimumStayLabel,
    model.stay?.checkInLabel,
    model.stay?.checkOutLabel,
  ].filter(Boolean),
});

const renderPanoramaTopBar = ({ model, onSelectTarget, activeTargetId }) => (
  <div {...getScrollRevealProps(0)}>
    <TemplateTopBar model={model} onSelectTarget={onSelectTarget} activeTargetId={activeTargetId}>
      <div className={styles.templateTopBarNav}>
        {PANORAMA_NAV_ITEMS.map((item) => renderPanoramaNavItem(item, Boolean(onSelectTarget)))}
      </div>
    </TemplateTopBar>
  </div>
);

const renderPanoramaTrustCards = ({ featuredTrustCards, onSelectTarget, activeTargetId }) => {
  if (featuredTrustCards.length < 1) {
    return null;
  }

  return (
    <section
      {...getPreviewTargetMarkerProps(styles.panoramaTrustRail, "visibility.trustCards", activeTargetId)}
      {...getScrollRevealProps(120)}
    >
      {featuredTrustCards.map((card, index) => {
        const cardIcon = getAmenityIconNode(card.iconAmenityId, {
          className: styles.panoramaTrustCardIconGlyph,
          "aria-hidden": true,
          focusable: "false",
          sx: {
            color: "#7f6640",
            fontSize: 22,
            padding: 0,
          },
        });

        return (
          <article
            key={card.id}
            {...getInteractiveTargetProps(styles.panoramaTrustCard, onSelectTarget, {
              sectionId: "trustCards",
              targetId: `trustCards.${index}`,
            }, activeTargetId)}
          >
            {cardIcon ? <span className={styles.panoramaTrustCardIcon}>{cardIcon}</span> : null}
            <div className={styles.panoramaTrustCardCopy}>
              <p className={styles.panoramaTrustCardTitle}>{card.title}</p>
              <p className={styles.panoramaTrustCardDescription}>{card.description}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
};

const renderPanoramaHeroSection = ({
  model,
  onSelectTarget,
  activeTargetId,
  showCallToAction,
  showTrustCards,
  featuredTrustCards,
}) => (
  <section id="overview" className={styles.panoramaEditorialHero} {...getScrollRevealProps(60)}>
    <div className={styles.panoramaHeroBackdropShell}>
      <img
        {...getInteractiveTargetProps(styles.panoramaHeroBackdrop, onSelectTarget, {
          sectionId: "images",
          targetId: "images.hero",
          imageSlot: { kind: "hero" },
        }, activeTargetId)}
        src={model.media.heroImage}
        alt={model.hero.title}
      />
      <div className={styles.panoramaHeroOverlay} aria-hidden="true" />
      <div className={styles.panoramaHeroInner}>
        <div className={styles.panoramaHeroCopyBlock}>
          <p
            {...getInteractiveTargetProps(styles.panoramaHeroEyebrow, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroEyebrow",
            }, activeTargetId)}
          >
            {model.hero.eyebrow}
          </p>
          <h1
            {...getInteractiveTargetProps(styles.panoramaHeroHeadline, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroTitle",
            }, activeTargetId)}
          >
            {model.hero.title}
          </h1>
          <p
            {...getInteractiveTargetProps(styles.panoramaHeroBlurb, onSelectTarget, {
              sectionId: "common",
              targetId: "common.heroDescription",
            }, activeTargetId)}
          >
            {model.hero.description}
          </p>

          <div className={styles.panoramaHeroActionRow}>
            {showCallToAction ? (
              <div
                {...getInteractiveTargetProps(styles.panoramaHeroPrimaryAction, onSelectTarget, {
                  sectionId: "common",
                  targetId: "common.ctaLabel",
                }, activeTargetId)}
              >
                <strong>{model.callToAction.label}</strong>
                <span>{model.callToAction.note || model.stay?.nightlyRateLabel || "Direct booking website"}</span>
              </div>
            ) : null}

            {model.location?.label ? (
              <div className={styles.panoramaHeroSecondaryMeta}>{model.location.label}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>

    {showTrustCards ? renderPanoramaTrustCards({ featuredTrustCards, onSelectTarget, activeTargetId }) : null}
  </section>
);

const renderPanoramaResidenceSection = ({
  model,
  onSelectTarget,
  activeTargetId,
  residenceVisual,
  residenceMeta,
  heroStats,
}) => (
  <section id="about" className={styles.sectionCard} {...getScrollRevealProps(80)}>
    <div className={styles.sectionHeading}>
      <p className={styles.sectionEyebrow}>The residence</p>
      <h2>Designed to present the stay with clarity and confidence</h2>
    </div>

    <div className={styles.panoramaResidenceGrid}>
      <div className={styles.panoramaResidenceCopy}>
        <p className={styles.heroDescription}>{model.hero.description}</p>
        {model.location?.narrative ? <p className={styles.heroDescription}>{model.location.narrative}</p> : null}

        {heroStats.length > 0 ? (
          <div className={styles.statGrid}>
            {heroStats.map((stat) => (
              <div key={stat.id} className={styles.statCard}>
                <span className={styles.statLabel}>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.panoramaResidenceVisualColumn}>
        <img
          {...getInteractiveTargetProps(
            styles.panoramaResidenceImage,
            onSelectTarget,
            residenceVisual.target,
            activeTargetId
          )}
          src={residenceVisual.imageUrl}
          alt={residenceVisual.alt}
        />

        {residenceMeta.length > 0 ? (
          <div className={styles.panoramaResidenceMetaGrid}>
            {residenceMeta.map((item) => (
              <div key={item} className={styles.inlineStat}>
                <span className={styles.statLabel}>Stay detail</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </section>
);

const renderPanoramaGallerySection = ({ gallerySlots, onSelectTarget, activeTargetId }) => {
  if (gallerySlots.length < 1) {
    return null;
  }

  return (
    <section id="gallery" className={styles.sectionCard} {...getScrollRevealProps(100)}>
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>Gallery</p>
        <h2>A more editorial presentation of the property</h2>
      </div>

      <div className={styles.panoramaGalleryMosaic}>
        {gallerySlots.map((slot, index) => (
          <img
            key={slot.key}
            {...getInteractiveTargetProps(
              `${styles.panoramaGalleryTile} ${index === 0 ? styles.panoramaGalleryTileLarge : ""}`.trim(),
              onSelectTarget,
              slot.target,
              activeTargetId
            )}
            src={slot.imageUrl}
            alt={slot.alt}
          />
        ))}
      </div>
    </section>
  );
};

const renderPanoramaDetailsSection = ({
  model,
  showAmenitiesPanel,
  featuredAmenities,
  featuredPolicies,
  activeTargetId,
}) => {
  if (!showAmenitiesPanel && featuredPolicies.length < 1) {
    return null;
  }

  return (
    <section id="features" className={styles.sectionCard} {...getScrollRevealProps(120)}>
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>Amenities</p>
        <h2>Useful stay details without losing the premium presentation</h2>
      </div>

      <div className={styles.panoramaDetailsGrid}>
        {showAmenitiesPanel ? (
          <div
            {...getPreviewTargetMarkerProps(
              styles.panoramaAmenityGrid,
              "visibility.amenitiesPanel",
              activeTargetId
            )}
          >
            {featuredAmenities.map((amenity) => {
              const amenityIcon = getAmenityIconNode(amenity.id, {
                className: styles.panoramaAmenityIconGlyph,
                "aria-hidden": true,
                focusable: "false",
                sx: {
                  color: "#6d5837",
                  fontSize: 18,
                  padding: 0,
                },
              });

              return (
                <div key={amenity.id} className={styles.panoramaAmenityCard}>
                  {amenityIcon ? <span className={styles.panoramaAmenityIcon}>{amenityIcon}</span> : null}
                  <strong>{amenity.label}</strong>
                  <span>{amenity.category || "Included in this stay"}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className={styles.panoramaInfoStack}>
          {model.location?.label ? (
            <div className={styles.copyCard}>
              <strong>Location</strong>
              <p>{model.location.label}</p>
            </div>
          ) : null}

          {model.policies?.summary ? (
            <div className={styles.copyCard}>
              <strong>Policies</strong>
              <p>{model.policies.summary}</p>
            </div>
          ) : null}

          {featuredPolicies.length > 0 ? (
            <div className={styles.copyCard}>
              <strong>Stay highlights</strong>
              <p>{featuredPolicies.join("\n")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const renderPanoramaJourneySection = ({ featuredJourneyStops, onSelectTarget, activeTargetId }) => {
  if (featuredJourneyStops.length < 1) {
    return null;
  }

  return (
    <section id="lifestyle" className={styles.sectionCard} {...getScrollRevealProps(140)}>
      <div className={styles.sectionHeading}>
        <p className={styles.sectionEyebrow}>The stay</p>
        <h2>From first impression to arrival, the flow stays easy to follow</h2>
      </div>

      <div
        {...getPreviewTargetMarkerProps(styles.panoramaJourneyGrid, "visibility.journeyStops", activeTargetId)}
      >
        {featuredJourneyStops.map((stop, index) => (
          <article
            key={stop.id}
            {...getInteractiveTargetProps(styles.panoramaJourneyCard, onSelectTarget, {
              sectionId: "journeyStops",
              targetId: `journeyStops.${index}`,
            }, activeTargetId)}
          >
            <span className={styles.panoramaJourneyIndex}>0{index + 1}</span>
            <p className={styles.panoramaJourneyTitle}>{stop.title}</p>
            <p className={styles.panoramaJourneyDescription}>{stop.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default function PanoramaLandingTemplate({ model, onSelectTarget, activeTargetId }) {
  const viewState = buildPanoramaViewState(model);
  const residenceVisual = buildResidenceVisual(viewState.gallerySlots, model);

  return (
    <article className={styles.templateSite}>
      {viewState.showTopBar ? renderPanoramaTopBar({ model, onSelectTarget, activeTargetId }) : null}
      {renderPanoramaHeroSection({
        model,
        onSelectTarget,
        activeTargetId,
        showCallToAction: viewState.showCallToAction,
        showTrustCards: viewState.showTrustCards,
        featuredTrustCards: viewState.featuredTrustCards,
      })}
      {renderPanoramaResidenceSection({
        model,
        onSelectTarget,
        activeTargetId,
        residenceVisual,
        residenceMeta: viewState.residenceMeta,
        heroStats: viewState.heroStats,
      })}
      {viewState.showGallerySection
        ? renderPanoramaGallerySection({
            gallerySlots: viewState.gallerySlots,
            onSelectTarget,
            activeTargetId,
          })
        : null}
      {renderPanoramaDetailsSection({
        model,
        showAmenitiesPanel: viewState.showAmenitiesPanel,
        featuredAmenities: viewState.featuredAmenities,
        featuredPolicies: viewState.featuredPolicies,
        activeTargetId,
      })}
      {viewState.showJourneyStops
        ? renderPanoramaJourneySection({
            featuredJourneyStops: viewState.featuredJourneyStops,
            onSelectTarget,
            activeTargetId,
          })
        : null}
      {viewState.showAvailabilityCalendar ? (
        <section id="availability" className={styles.panoramaAvailabilityShell} {...getScrollRevealProps(160)}>
          <TemplateAvailabilityCalendar
            model={model}
            onSelectTarget={onSelectTarget}
            activeTargetId={activeTargetId}
          />
        </section>
      ) : null}

      {viewState.showCallToAction ? (
        <section id="contact" className={styles.panoramaClosingShell} {...getScrollRevealProps(180)}>
          <TemplateSoftCallout
            className={styles.panoramaClosingCallout}
            model={model}
            onSelectTarget={onSelectTarget}
            activeTargetId={activeTargetId}
          />
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
      minimumStayLabel: PropTypes.string,
      checkInLabel: PropTypes.string,
      checkOutLabel: PropTypes.string,
    }).isRequired,
    location: PropTypes.shape({
      label: PropTypes.string,
      narrative: PropTypes.string,
    }).isRequired,
    policies: PropTypes.shape({
      featured: PropTypes.arrayOf(PropTypes.string),
      summary: PropTypes.string,
    }).isRequired,
    callToAction: callToActionPropType.isRequired,
    trustCards: PropTypes.arrayOf(copyItemPropType).isRequired,
    journeyStops: PropTypes.arrayOf(copyItemPropType).isRequired,
    gallery: galleryPropType.isRequired,
    amenities: PropTypes.shape({
      featured: PropTypes.arrayOf(amenityPropType).isRequired,
    }).isRequired,
    availability: availabilityPropType.isRequired,
    visibility: visibilityPropType.isRequired,
  }).isRequired,
  ...templateInteractionPropTypes,
};
