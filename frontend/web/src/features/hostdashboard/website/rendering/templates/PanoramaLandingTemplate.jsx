import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import PhotoBrowserOverlay from "../../../../../components/gallery/PhotoBrowserOverlay";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getScrollRevealProps } from "../animations/scrollRevealProps";
import { getAmenityIconNode } from "../amenityIconRegistry";
import {
  getInteractiveTargetProps,
  getPreviewTargetMarkerProps,
  TemplateAvailabilityCalendar,
  TemplateImageSlotVisual,
  TemplateTopBar,
} from "./templateSharedSections";
import {
  amenityPropType,
  amenitiesSectionPropType,
  availabilityPropType,
  calendarSectionPropType,
  callToActionPropType,
  contactSectionPropType,
  copyItemPropType,
  galleryPropType,
  gallerySectionPropType,
  heroPropType,
  hostPropType,
  mediaPropType,
  residenceSectionPropType,
  sitePropType,
  templateInteractionPropTypes,
  visibilityPropType,
} from "./templatePropTypes";
import {
  DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
  DEFAULT_WEBSITE_CONTACT_TITLE,
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactAvatarMode,
  resolveWebsiteContactBackgroundColor,
} from "../../config/websiteContactSectionConfig";
import { resolveWebsiteResidencePanelColor } from "../../config/websiteResidenceSectionConfig";
import { resolveWebsiteGalleryPanelColor } from "../../config/websiteGallerySectionConfig";
import {
  MAX_WEBSITE_CONFIGURABLE_AMENITIES,
  resolveWebsiteAmenityIconColor,
} from "../../config/websiteAmenitiesConfig";

const PANORAMA_TOP_BAR_SOLID_THRESHOLD_PX = 24;
const PANORAMA_TOP_BAR_SELECTOR = "[data-panorama-top-bar]";
const PANORAMA_TOP_BAR_SCROLL_OFFSET_PX = 18;
const PANORAMA_AMENITY_CATEGORY_LABELS = Object.freeze({
  EcoFriendly: "Eco Friendly",
  ExtraServices: "Extra Services",
  FamilyFriendly: "Family Friendly",
  LivingArea: "Living Area",
});

const hexToRgbChannels = (hexColor) => {
  const normalizedHexColor = resolveWebsiteContactAccentColor(hexColor).slice(1);
  const redChannel = Number.parseInt(normalizedHexColor.slice(0, 2), 16);
  const greenChannel = Number.parseInt(normalizedHexColor.slice(2, 4), 16);
  const blueChannel = Number.parseInt(normalizedHexColor.slice(4, 6), 16);
  return `${redChannel} ${greenChannel} ${blueChannel}`;
};

const handlePanoramaNavItemClick = (href) => (event) => {
  const normalizedHref = String(href || "").trim();
  if (!normalizedHref.startsWith("#")) {
    return;
  }

  const targetId = normalizedHref.slice(1);
  const targetElement = globalThis.document?.getElementById(targetId);
  if (!targetElement) {
    return;
  }

  event.preventDefault();

  const topBarElement = globalThis.document.querySelector(PANORAMA_TOP_BAR_SELECTOR);
  const topBarHeight = topBarElement?.getBoundingClientRect().height || 0;
  const prefersReducedMotion =
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nextScrollTop =
    targetElement.getBoundingClientRect().top +
    globalThis.scrollY -
    topBarHeight -
    PANORAMA_TOP_BAR_SCROLL_OFFSET_PX;

  if (globalThis.history && typeof globalThis.history.replaceState === "function") {
    globalThis.history.replaceState(globalThis.history.state, "", normalizedHref);
  }

  globalThis.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
};

const renderPanoramaNavItem = ({ href, label }, isInteractivePreview) => {
  if (isInteractivePreview) {
    return <span key={href}>{label}</span>;
  }

  return (
    <a key={href} href={href} onClick={handlePanoramaNavItemClick(href)}>
      {label}
    </a>
  );
};

const buildPanoramaGallerySlots = (model) => {
  const galleryImages = Array.isArray(model.gallery?.images) ? model.gallery.images.filter(Boolean) : [];

  if (galleryImages.length > 0) {
    return galleryImages.slice(0, 6).map((imageUrl, index) => ({
      key: `${model.site.title}-${index}-${imageUrl}`,
      alt: `${model.hero.title} view ${index + 1}`,
      slot: { kind: "gallery", index, sectionId: "gallery" },
    }));
  }

  const heroImage = String(model.media?.heroImage || "").trim();
  if (!heroImage) {
    return [];
  }

  return [
    {
      key: `${model.site.title}-hero-fallback`,
      alt: model.hero.title,
      slot: { kind: "hero", sectionId: "gallery" },
    },
  ];
};

const formatPanoramaAmenityCategory = (value) => {
  const normalizedValue = String(value || "").trim();
  return PANORAMA_AMENITY_CATEGORY_LABELS[normalizedValue] || normalizedValue || "Amenities";
};

const getAmenityMatchKey = (amenity) => {
  const normalizedId = String(amenity?.id || "").trim();
  if (normalizedId) {
    return normalizedId.toLowerCase();
  }

  return String(amenity?.label || "").trim().toLowerCase();
};

const mergePanoramaModalAmenities = (configuredAmenities = [], importedAmenities = []) => {
  const normalizedConfiguredAmenities = Array.isArray(configuredAmenities) ? configuredAmenities : [];
  const normalizedImportedAmenities = Array.isArray(importedAmenities) ? importedAmenities : [];
  const configuredAmenityMap = new Map(
    normalizedConfiguredAmenities
      .map((amenity) => [getAmenityMatchKey(amenity), amenity])
      .filter(([amenityKey]) => Boolean(amenityKey))
  );
  const mergedAmenities = normalizedImportedAmenities.map((amenity) => {
    const amenityKey = getAmenityMatchKey(amenity);
    return configuredAmenityMap.get(amenityKey) || amenity;
  });
  const seenAmenityKeys = new Set(mergedAmenities.map((amenity) => getAmenityMatchKey(amenity)).filter(Boolean));
  const configuredOnlyAmenities = normalizedConfiguredAmenities.filter((amenity) => {
    const amenityKey = getAmenityMatchKey(amenity);
    if (!amenityKey || seenAmenityKeys.has(amenityKey)) {
      return false;
    }

    seenAmenityKeys.add(amenityKey);
    return true;
  });

  return [...mergedAmenities, ...configuredOnlyAmenities];
};

const buildPanoramaViewState = (model) => {
  const configuredAmenities = Array.isArray(model.amenities?.all) ? model.amenities.all : [];
  const importedAmenities = Array.isArray(model.amenities?.imported)
    ? model.amenities.imported
    : configuredAmenities;
  const allAmenities = mergePanoramaModalAmenities(configuredAmenities, importedAmenities);
  let featuredAmenities = [];

  if (configuredAmenities.length > 0) {
    featuredAmenities = configuredAmenities.slice(0, MAX_WEBSITE_CONFIGURABLE_AMENITIES);
  } else if (Array.isArray(model.amenities?.featured)) {
    featuredAmenities = model.amenities.featured.slice(0, MAX_WEBSITE_CONFIGURABLE_AMENITIES);
  }

  return {
    showTopBar: model.visibility?.topBar !== false,
    showTrustCards: model.visibility?.trustCards !== false,
    showGallerySection: model.visibility?.gallerySection !== false,
    showAmenitiesPanel: model.visibility?.amenitiesPanel !== false,
    showAvailabilityCalendar: model.visibility?.availabilityCalendar !== false,
    showCallToAction: model.visibility?.callToAction !== false,
    showJourneyStops: model.visibility?.journeyStops !== false,
    showContactSection: model.visibility?.contactSection !== false,
    gallerySlots: buildPanoramaGallerySlots(model),
    allAmenities,
    amenityIconColor: resolveWebsiteAmenityIconColor(
      model.amenities?.iconColor,
      "panorama-landing"
    ),
    residenceCards: [
      ...(Array.isArray(model.stay?.stats) ? model.stay.stats.slice(0, 4) : []),
      {
        id: "residence-minimum-stay",
        label: "Minimum stay",
        value: model.stay?.minimumStayLabel,
      },
      {
        id: "residence-check-in",
        label: "Check-in",
        value: model.stay?.checkInLabel,
      },
      {
        id: "residence-check-out",
        label: "Check-out",
        value: model.stay?.checkOutLabel,
      },
    ].filter((item) => Boolean(item?.value)),
    featuredTrustCards: Array.isArray(model.trustCards) ? model.trustCards.slice(0, 3) : [],
    featuredAmenities,
    featuredJourneyStops: Array.isArray(model.journeyStops) ? model.journeyStops.slice(0, 3) : [],
  };
};

const usePanoramaTopBarSolidState = (enabled) => {
  const heroSectionRef = useRef(null);
  const [isTopBarSolid, setIsTopBarSolid] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsTopBarSolid(false);
      return undefined;
    }

    const heroSectionNode = heroSectionRef.current;
    if (!heroSectionNode) {
      return undefined;
    }

    let animationFrameId = 0;

    const updateTopBarState = () => {
      animationFrameId = 0;
      const nextIsTopBarSolid =
        heroSectionNode.getBoundingClientRect().top <= -PANORAMA_TOP_BAR_SOLID_THRESHOLD_PX;

      setIsTopBarSolid((currentIsTopBarSolid) =>
        currentIsTopBarSolid === nextIsTopBarSolid ? currentIsTopBarSolid : nextIsTopBarSolid
      );
    };

    const queueTopBarStateUpdate = () => {
      if (animationFrameId) {
        return;
      }

      if (typeof globalThis.requestAnimationFrame === "function") {
        animationFrameId = globalThis.requestAnimationFrame(updateTopBarState);
        return;
      }

      updateTopBarState();
    };

    queueTopBarStateUpdate();
    globalThis.addEventListener("scroll", queueTopBarStateUpdate, { passive: true });
    globalThis.addEventListener("resize", queueTopBarStateUpdate);

    return () => {
      if (animationFrameId && typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(animationFrameId);
      }

      globalThis.removeEventListener("scroll", queueTopBarStateUpdate);
      globalThis.removeEventListener("resize", queueTopBarStateUpdate);
    };
  }, [enabled]);

  return {
    heroSectionRef,
    isTopBarSolid,
  };
};

const buildPanoramaNavItems = (viewState) =>
  [
    { href: "#overview", label: "Overview" },
    ...(viewState.showGallerySection && viewState.gallerySlots.length > 0
      ? [{ href: "#gallery", label: "Gallery" }]
      : []),
    ...(viewState.showAmenitiesPanel && viewState.featuredAmenities.length > 0
      ? [{ href: "#features", label: "Amenities" }]
      : []),
    ...(viewState.showAvailabilityCalendar ? [{ href: "#availability", label: "Availability" }] : []),
    ...(viewState.showContactSection ? [{ href: "#contact", label: "Contact" }] : []),
  ];

function PanoramaAmenitiesModal({ amenities, amenityIconColor, onClose }) {
  const groupedAmenities = useMemo(
    () =>
      Object.entries(
        amenities.reduce((categories, amenity) => {
          const categoryKey = String(amenity?.category || "Amenities").trim() || "Amenities";
          if (!categories[categoryKey]) {
            categories[categoryKey] = [];
          }

          categories[categoryKey].push(amenity);
          return categories;
        }, {})
      ).sort(([leftCategory], [rightCategory]) => leftCategory.localeCompare(rightCategory)),
    [amenities]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <dialog
      open
      className={styles.panoramaAmenitiesModalOverlay}
      aria-labelledby="panorama-amenities-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className={styles.panoramaAmenitiesModalBackdrop}
        onClick={onClose}
        aria-label="Close amenities panel"
        tabIndex={-1}
      />
      <div className={styles.panoramaAmenitiesModal}>
        <button
          type="button"
          className={styles.panoramaAmenitiesModalCloseButton}
          onClick={onClose}
          aria-label="Close amenities panel"
        >
          x
        </button>

        <h3 id="panorama-amenities-modal-title" className={styles.panoramaAmenitiesModalTitle}>
          Amenities
        </h3>

        <div className={styles.panoramaAmenitiesModalGroups}>
          {groupedAmenities.map(([category, categoryAmenities]) => (
            <section key={category} className={styles.panoramaAmenitiesModalGroup}>
              <h4 className={styles.panoramaAmenitiesModalCategoryTitle}>
                {formatPanoramaAmenityCategory(category)}
              </h4>

              <div className={styles.panoramaAmenitiesModalItems}>
                {categoryAmenities.map((amenity) => {
                  const amenityIcon = getAmenityIconNode(amenity.iconAmenityId || amenity.id, {
                    className: styles.panoramaAmenitiesModalItemIconGlyph,
                    "aria-hidden": true,
                    focusable: "false",
                    sx: {
                      color: amenityIconColor,
                      fontSize: 18,
                      padding: 0,
                    },
                  });

                  return (
                    <div key={amenity.id} className={styles.panoramaAmenitiesModalItem}>
                      {amenityIcon ? (
                        <span className={styles.panoramaAmenitiesModalItemIcon}>{amenityIcon}</span>
                      ) : null}
                      <span className={styles.panoramaAmenitiesModalItemLabel}>{amenity.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </dialog>,
    document.body
  );
}

PanoramaAmenitiesModal.propTypes = {
  amenities: PropTypes.arrayOf(amenityPropType).isRequired,
  amenityIconColor: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

const renderPanoramaTopBar = ({ model, onSelectTarget, activeTargetId, isTopBarSolid, navItems }) => (
  <div
    data-panorama-top-bar="true"
    className={`${styles.panoramaTopBarShell} ${
      isTopBarSolid ? styles.panoramaTopBarShellSolid : styles.panoramaTopBarShellTransparent
    }`.trim()}
  >
    <TemplateTopBar
      model={model}
      onSelectTarget={onSelectTarget}
      activeTargetId={activeTargetId}
      showMark={false}
    >
      <div className={styles.templateTopBarNav}>
        {navItems.map((item) => renderPanoramaNavItem(item, Boolean(onSelectTarget)))}
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
  heroSectionRef,
  showCallToAction,
  showTrustCards,
  featuredTrustCards,
}) => (
  <section
    id="overview"
    ref={heroSectionRef}
    className={styles.panoramaEditorialHero}
    {...getScrollRevealProps(60)}
  >
    <div className={styles.panoramaHeroBackdropShell}>
      <TemplateImageSlotVisual
        model={model}
        slot={{ kind: "hero" }}
        imageClassName={styles.panoramaHeroBackdrop}
        alt={model.hero.title}
        onSelectTarget={onSelectTarget}
        activeTargetId={activeTargetId}
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
  residenceCards,
}) => {
  const residenceRevealProps = getScrollRevealProps(80);
  const residencePanelStyle = model.residenceSection?.showPanel
    ? {
        backgroundColor: resolveWebsiteResidencePanelColor(model.residenceSection?.panelColor),
      }
    : undefined;
  const residenceSectionStyle = residencePanelStyle
    ? {
        ...residenceRevealProps.style,
        ...residencePanelStyle,
      }
    : residenceRevealProps.style;

  return (
    <section
      id="about"
      {...getInteractiveTargetProps(
        `${styles.panoramaResidenceSection} ${
          model.residenceSection?.showPanel ? styles.panoramaResidenceSectionPanel : ""
        }`.trim(),
        onSelectTarget,
        {
          sectionId: "residence",
          targetId: "residence.showPanel",
        },
        activeTargetId
      )}
      {...residenceRevealProps}
      style={residenceSectionStyle}
    >
      <div className={`${styles.sectionHeading} ${styles.panoramaResidenceHeading}`.trim()}>
        <p
          {...getInteractiveTargetProps(styles.panoramaResidenceEyebrow, onSelectTarget, {
            sectionId: "residence",
            targetId: "residence.title",
          }, activeTargetId)}
        >
          {model.residenceSection?.title || "The residence"}
        </p>
        <h2
          {...getInteractiveTargetProps(styles.panoramaResidenceHeadline, onSelectTarget, {
            sectionId: "residence",
            targetId: "residence.headline",
          }, activeTargetId)}
        >
          {model.residenceSection?.headline || "Designed to present the stay with clarity and confidence"}
        </h2>
      </div>

    <div className={styles.panoramaResidenceGrid}>
      <div className={styles.panoramaResidenceVisualColumn}>
        <TemplateImageSlotVisual
          model={model}
          slot={{ kind: "residence" }}
          frameClassName={styles.panoramaResidenceVisualFrame}
          imageClassName={styles.panoramaResidenceImage}
          alt={`${model.hero.title} residence view`}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      </div>

        <div className={styles.panoramaResidenceCopy}>
          <p
            {...getInteractiveTargetProps(styles.heroDescription, onSelectTarget, {
              sectionId: "residence",
              targetId: "residence.description",
            }, activeTargetId)}
          >
            {model.hero.description}
          </p>
        </div>
      </div>

      {residenceCards.length > 0 ? (
        <div className={styles.panoramaResidenceCardRail}>
          {residenceCards.map((item) => (
            <div key={item.id} className={`${styles.inlineStat} ${styles.panoramaResidenceCard}`.trim()}>
              <span className={styles.statLabel}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const renderPanoramaGallerySection = ({
  model,
  gallerySlots,
  onSelectTarget,
  activeTargetId,
  onOpenGalleryBrowser,
}) => {
  if (gallerySlots.length < 1) {
    return null;
  }

  const galleryRevealProps = getScrollRevealProps(100);
  const showGalleryPanel = model.gallerySection?.showPanel !== false;
  const galleryPanelStyle = showGalleryPanel
    ? {
        backgroundColor: resolveWebsiteGalleryPanelColor(
          model.gallerySection?.panelColor,
          "panorama-landing"
        ),
      }
    : undefined;
  const gallerySectionStyle = galleryPanelStyle
    ? {
        ...galleryRevealProps.style,
        ...galleryPanelStyle,
      }
    : galleryRevealProps.style;

  return (
    <section
      id="gallery"
      {...getInteractiveTargetProps(
        `${styles.panoramaGallerySection} ${
          showGalleryPanel ? styles.panoramaGallerySectionPanel : ""
        }`.trim(),
        onSelectTarget,
        {
          sectionId: "gallery",
          targetId: "gallery.visibility",
        },
        activeTargetId
      )}
      {...galleryRevealProps}
      style={gallerySectionStyle}
    >
      <div className={styles.panoramaGalleryHeading}>
        <p
          {...getInteractiveTargetProps(styles.sectionEyebrow, onSelectTarget, {
            sectionId: "gallery",
            targetId: "gallery.title",
          }, activeTargetId)}
        >
          {model.gallerySection?.title || "Gallery"}
        </p>
        <h2
          {...getInteractiveTargetProps(styles.panoramaGalleryHeadingTitle, onSelectTarget, {
            sectionId: "gallery",
            targetId: "gallery.description",
          }, activeTargetId)}
        >
          {model.gallerySection?.description || "A more editorial presentation of the property"}
        </h2>
      </div>

      <div className={styles.panoramaGalleryGrid}>
        {gallerySlots.map((slot, index) => (
          <TemplateImageSlotVisual
            key={slot.key}
            model={model}
            slot={slot.slot}
            frameClassName={styles.panoramaGalleryTileFrame}
            imageClassName={styles.panoramaGalleryTile}
            alt={slot.alt}
            onSelectTarget={onSelectTarget}
            activeTargetId={activeTargetId}
          />
        ))}
      </div>

      {Array.isArray(model.media?.galleryImages) && model.media.galleryImages.length > 0 ? (
        <div className={styles.panoramaGalleryActions}>
          <button
            type="button"
            className={styles.panoramaAmenityShowAllButton}
            onClick={(event) => {
              event.stopPropagation();
              onOpenGalleryBrowser();
            }}
          >
            {model.gallerySection?.browseLabel || "Browse"}
          </button>
        </div>
      ) : null}
    </section>
  );
};

const renderPanoramaDetailsSection = ({
  showAmenitiesPanel,
  amenitiesSection,
  featuredAmenities,
  allAmenities,
  amenityIconColor,
  onSelectTarget,
  activeTargetId,
  onShowAllAmenities,
}) => {
  if (!showAmenitiesPanel || featuredAmenities.length < 1) {
    return null;
  }

  return (
    <section
      id="features"
      {...getInteractiveTargetProps(styles.panoramaAmenitiesSection, onSelectTarget, {
        sectionId: "amenities",
        targetId: "visibility.amenitiesPanel",
      }, activeTargetId)}
      {...getScrollRevealProps(120)}
    >
      <div className={styles.panoramaAmenityIntro}>
        <p
          {...getInteractiveTargetProps(styles.panoramaAmenityEyebrow, onSelectTarget, {
            sectionId: "amenities",
            targetId: "amenities.title",
          }, activeTargetId)}
        >
          {amenitiesSection?.title || "Amenities"}
        </p>
        <h2
          {...getInteractiveTargetProps(styles.panoramaAmenityTitle, onSelectTarget, {
            sectionId: "amenities",
            targetId: "amenities.description",
          }, activeTargetId)}
        >
          {amenitiesSection?.description || "Every Detail Considered"}
        </h2>
        <span className={styles.panoramaAmenityDivider} aria-hidden="true" />
      </div>

      <div className={styles.panoramaAmenityGrid}>
        {featuredAmenities.map((amenity, index) => {
          const amenityIcon = getAmenityIconNode(amenity.iconAmenityId || amenity.id, {
            className: styles.panoramaAmenityIconGlyph,
            "aria-hidden": true,
            focusable: "false",
            sx: {
              color: amenityIconColor,
              fontSize: 22,
              padding: 0,
            },
          });

          return (
            <div
              key={amenity.id}
              data-panorama-amenity-card="true"
              {...getInteractiveTargetProps(styles.panoramaAmenityCard, onSelectTarget, {
                sectionId: "amenities",
                targetId: `amenities.${index}`,
              }, activeTargetId)}
            >
              <span className={styles.panoramaAmenityIcon}>
                {amenityIcon}
              </span>
              <span className={styles.panoramaAmenityLabel}>{amenity.label}</span>
            </div>
          );
        })}
      </div>

      {allAmenities.length > 0 ? (
        <div className={styles.panoramaAmenityActions}>
          <button
            type="button"
            data-panorama-amenities-show-all="true"
            className={styles.panoramaAmenityShowAllButton}
            onClick={(event) => {
              event.stopPropagation();
              onShowAllAmenities();
            }}
          >
            Show all
          </button>
        </div>
      ) : null}
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

const renderPanoramaContactSection = ({
  model,
  onSelectTarget,
  activeTargetId,
}) => {
  const contactTitle = String(model.contactSection?.title || "").trim() || DEFAULT_WEBSITE_CONTACT_TITLE;
  const contactDescription =
    String(model.contactSection?.description || "").trim() || DEFAULT_WEBSITE_CONTACT_DESCRIPTION;
  const hostName = String(model.host?.name || "").trim() || "Host";
  const hostInitial = String(model.host?.initial || hostName.charAt(0) || "H")
    .trim()
    .charAt(0)
    .toUpperCase() || "H";
  const avatarMode = resolveWebsiteContactAvatarMode(
    model.contactSection?.avatarMode,
    String(model.contactSection?.avatarImage || "").trim()
      ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
      : WEBSITE_CONTACT_AVATAR_MODE_HOST
  );
  let hostProfileImage = "";
  if (avatarMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM) {
    hostProfileImage = String(model.contactSection?.avatarImage || "").trim();
  } else if (avatarMode === WEBSITE_CONTACT_AVATAR_MODE_HOST) {
    hostProfileImage = String(model.host?.profileImage || "").trim();
  }
  const accentColor = resolveWebsiteContactAccentColor(model.contactSection?.accentColor);
  const backgroundColor = resolveWebsiteContactBackgroundColor(model.contactSection?.backgroundColor);
  const contactSectionStyle = {
    "--panorama-contact-accent": accentColor,
    "--panorama-contact-accent-rgb": hexToRgbChannels(accentColor),
    "--panorama-contact-background": backgroundColor,
    "--panorama-contact-background-rgb": hexToRgbChannels(backgroundColor),
  };

  return (
    <section id="contact" className={styles.panoramaContactShell} {...getScrollRevealProps(180)}>
      <div
        {...getPreviewTargetMarkerProps(
          styles.panoramaContactSection,
          "contact.backgroundColor",
          activeTargetId
        )}
        style={contactSectionStyle}
      >
        <div className={styles.panoramaContactCopy}>
          <p
            {...getInteractiveTargetProps(styles.panoramaContactEyebrow, onSelectTarget, {
              sectionId: "contact",
              targetId: "contact.accentColor",
            }, activeTargetId)}
          >
            Contact
          </p>
          <h2
            {...getInteractiveTargetProps(styles.panoramaContactTitle, onSelectTarget, {
              sectionId: "contact",
              targetId: "contact.title",
            }, activeTargetId)}
          >
            {contactTitle}
          </h2>
          <p
            {...getInteractiveTargetProps(styles.panoramaContactDescription, onSelectTarget, {
              sectionId: "contact",
              targetId: "contact.description",
            }, activeTargetId)}
          >
            {contactDescription}
          </p>
        </div>

        <div className={styles.panoramaHostCard}>
          <div
            {...getInteractiveTargetProps(styles.panoramaHostAvatarShell, onSelectTarget, {
              sectionId: "contact",
              targetId: "contact.avatarImage",
            }, activeTargetId)}
          >
            {hostProfileImage ? (
              <img src={hostProfileImage} alt={hostName} className={styles.panoramaHostAvatar} />
            ) : (
              <span className={styles.panoramaHostAvatarFallback} aria-hidden="true">
                {hostInitial}
              </span>
            )}
          </div>
          <div className={styles.panoramaHostCopy}>
            <span className={styles.panoramaHostLabel}>Hosted by</span>
            <h2 className={styles.panoramaHostName}>{hostName}</h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function PanoramaLandingTemplate({ model, onSelectTarget, activeTargetId }) {
  const viewState = useMemo(() => buildPanoramaViewState(model), [model]);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [isGalleryBrowserOpen, setIsGalleryBrowserOpen] = useState(false);
  const { heroSectionRef, isTopBarSolid } = usePanoramaTopBarSolidState(viewState.showTopBar);
  const navItems = buildPanoramaNavItems(viewState);

  return (
    <>
      <article className={styles.templateSite}>
        {viewState.showTopBar
          ? renderPanoramaTopBar({ model, onSelectTarget, activeTargetId, isTopBarSolid, navItems })
          : null}
        {renderPanoramaHeroSection({
          model,
          onSelectTarget,
          activeTargetId,
          heroSectionRef,
          showCallToAction: viewState.showCallToAction,
          showTrustCards: viewState.showTrustCards,
          featuredTrustCards: viewState.featuredTrustCards,
        })}
        {renderPanoramaResidenceSection({
          model,
          onSelectTarget,
          activeTargetId,
          residenceCards: viewState.residenceCards,
        })}
        {viewState.showGallerySection
          ? renderPanoramaGallerySection({
              model,
              gallerySlots: viewState.gallerySlots,
              onSelectTarget,
              activeTargetId,
              onOpenGalleryBrowser: () => setIsGalleryBrowserOpen(true),
            })
          : null}
        {renderPanoramaDetailsSection({
          showAmenitiesPanel: viewState.showAmenitiesPanel,
          amenitiesSection: model.amenitiesSection,
          featuredAmenities: viewState.featuredAmenities,
          allAmenities: viewState.allAmenities,
          amenityIconColor: viewState.amenityIconColor,
          onSelectTarget,
          activeTargetId,
          onShowAllAmenities: () => setShowAmenitiesModal(true),
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
              variant="panorama"
              templateKey="panorama-landing"
              propertyTitle={model.site.title}
              onSelectTarget={onSelectTarget}
              activeTargetId={activeTargetId}
            />
          </section>
        ) : null}

        {viewState.showContactSection
          ? renderPanoramaContactSection({
              model,
              onSelectTarget,
              activeTargetId,
            })
          : null}
      </article>

      <PhotoBrowserOverlay
        images={Array.isArray(model.media?.galleryImages) ? model.media.galleryImages : []}
        isOpen={isGalleryBrowserOpen}
        onClose={() => setIsGalleryBrowserOpen(false)}
        showSideZones={true}
        alwaysShowSideZoneArrows={true}
        resolveImageAlt={(index) => `${model.hero.title} gallery image ${index + 1}`}
      />

      {showAmenitiesModal && viewState.allAmenities.length > 0 ? (
        <PanoramaAmenitiesModal
          amenities={viewState.allAmenities}
          amenityIconColor={viewState.amenityIconColor}
          onClose={() => setShowAmenitiesModal(false)}
        />
      ) : null}
    </>
  );
}

PanoramaLandingTemplate.propTypes = {
  model: PropTypes.shape({
    site: sitePropType.isRequired,
    hero: heroPropType.isRequired,
    media: mediaPropType.isRequired,
    calendarSection: calendarSectionPropType,
    residenceSection: residenceSectionPropType,
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
    gallerySection: gallerySectionPropType,
    amenities: PropTypes.shape({
      imported: PropTypes.arrayOf(amenityPropType),
      iconColor: PropTypes.string,
      featured: PropTypes.arrayOf(amenityPropType).isRequired,
      all: PropTypes.arrayOf(amenityPropType),
    }).isRequired,
    amenitiesSection: amenitiesSectionPropType,
    availability: availabilityPropType.isRequired,
    visibility: visibilityPropType.isRequired,
    host: hostPropType.isRequired,
    contactSection: contactSectionPropType.isRequired,
  }).isRequired,
  ...templateInteractionPropTypes,
};
