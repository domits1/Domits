import React, { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import {
  buildWebsiteImageSlotTarget,
  useWebsiteImageSlotRotation,
} from "../websiteImageSlotUtils";

const DEFAULT_IMAGE_SLOT_ROTATION_INTERVAL_MS = 3600;
const DEFAULT_IMAGE_SLOT_FADE_DURATION_MS = 720;
const LazyAvailabilityCalendarPreview = lazy(() => import("../AvailabilityCalendarPreview"));
const ORIGINAL_FIRST_IMAGE_SOURCE_ORDER = Object.freeze(["originalSrc", "webSrc", "src", "thumbSrc"]);

const buildImageSlotFrameClassName = ({
  frameClassName = "",
  imageClassName = "",
  enableHoverEffect = false,
}) =>
  `${frameClassName || imageClassName} ${styles.templateRotatingImageFrame} ${
    enableHoverEffect ? styles.templateImageHoverFrame : ""
  }`.trim();

const buildImageSlotImageClassName = (imageClassName, enableHoverEffect = false) =>
  `${imageClassName} ${enableHoverEffect ? styles.templateImageHoverImage : ""}`.trim();

const buildImageLoadingProps = ({ slot, imageIndex = 0, isRotationEnabled = false, isInteractivePreview = false }) => {
  if (isInteractivePreview) {
    return {
      decoding: "async",
    };
  }

  const isHeroSlot = slot?.kind === "hero";
  const isLeadHeroImage = isHeroSlot && (!isRotationEnabled || imageIndex === 0);

  return {
    loading: isLeadHeroImage ? "eager" : "lazy",
    fetchPriority: isLeadHeroImage ? "high" : "low",
    decoding: "async",
  };
};

const buildResponsiveImageProps = ({
  slot,
  model,
  isRotationEnabled = false,
  isInteractivePreview = false,
  disableResponsiveImageVariants = false,
}) => {
  if (
    isInteractivePreview ||
    isRotationEnabled ||
    disableResponsiveImageVariants ||
    slot?.kind !== "hero"
  ) {
    return {};
  }

  const heroImageAsset =
    model?.media?.heroImageAsset && typeof model.media.heroImageAsset === "object"
      ? model.media.heroImageAsset
      : null;
  const responsiveSrcSet = String(heroImageAsset?.srcSet || "").trim();
  if (!responsiveSrcSet) {
    return {};
  }

  return {
    srcSet: responsiveSrcSet,
    sizes: String(heroImageAsset?.sizes || "100vw").trim() || "100vw",
  };
};

const resolvePreferredImageAssetSource = (imageAsset, sourceOrder = ORIGINAL_FIRST_IMAGE_SOURCE_ORDER) => {
  if (!imageAsset || typeof imageAsset !== "object") {
    return "";
  }

  for (const sourceKey of sourceOrder) {
    const sourceValue = String(imageAsset?.[sourceKey] || "").trim();
    if (sourceValue) {
      return sourceValue;
    }
  }

  return "";
};

const buildPreferredHeroImageSequence = (model, sourceOrder = ORIGINAL_FIRST_IMAGE_SOURCE_ORDER) => {
  const imageSequence = [];
  const seenImageUrls = new Set();
  const galleryImageAssets = Array.isArray(model?.media?.galleryImageAssets)
    ? model.media.galleryImageAssets
    : [];
  const fallbackGalleryImages = Array.isArray(model?.media?.galleryImages) ? model.media.galleryImages : [];

  const appendImageUrl = (imageUrl) => {
    const normalizedImageUrl = String(imageUrl || "").trim();
    if (!normalizedImageUrl || seenImageUrls.has(normalizedImageUrl)) {
      return;
    }

    seenImageUrls.add(normalizedImageUrl);
    imageSequence.push(normalizedImageUrl);
  };

  appendImageUrl(resolvePreferredImageAssetSource(model?.media?.heroImageAsset, sourceOrder));
  galleryImageAssets.forEach((imageAsset) =>
    appendImageUrl(resolvePreferredImageAssetSource(imageAsset, sourceOrder))
  );
  appendImageUrl(model?.media?.heroImage);
  fallbackGalleryImages.forEach((imageUrl) => appendImageUrl(imageUrl));

  return imageSequence;
};

export const getInteractiveTargetProps = (
  className,
  onSelectTarget,
  target,
  activeTargetId = "",
  onActivate = undefined
) => {
  const targetId = target?.targetId || "";
  const hasInteraction = Boolean(onSelectTarget || onActivate);

  if (!hasInteraction) {
    return {
      className,
      "data-preview-target-id": targetId || undefined,
    };
  }

  const isActiveTarget = targetId && targetId === activeTargetId;
  const handleActivate = (event) => {
    event?.stopPropagation?.();
    if (onSelectTarget) {
      onSelectTarget(target);
    }

    if (onActivate) {
      onActivate(event, target);
    }
  };

  return {
    className: `${className} ${styles.previewInteractiveTarget} ${
      isActiveTarget ? styles.previewInteractiveTargetActive : ""
    }`.trim(),
    "data-preview-target-id": targetId || undefined,
    role: "button",
    tabIndex: 0,
    onClick: handleActivate,
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleActivate(event);
      }
    },
  };
};

export const getPreviewTargetMarkerProps = (className, targetId, activeTargetId = "") => ({
  className: `${className} ${styles.previewInteractiveTarget} ${
    targetId && targetId === activeTargetId ? styles.previewInteractiveTargetActive : ""
  }`.trim(),
  "data-preview-target-id": targetId || undefined,
});

export function TemplateTopBar({
  model,
  onSelectTarget = undefined,
  activeTargetId = "",
  showMark = true,
  children,
}) {
  return (
    <div
      {...getInteractiveTargetProps(styles.templateTopBar, onSelectTarget, {
        sectionId: "common",
        targetId: "common.siteTitle",
      }, activeTargetId)}
    >
      <div className={styles.templateTopBarBrand}>
        {showMark ? <span className={styles.templateTopBarMark} aria-hidden="true" /> : null}
        <span>{model.site.title}</span>
      </div>
      {children}
    </div>
  );
}

TemplateTopBar.propTypes = {
  model: PropTypes.shape({
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
  showMark: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export function TemplateHeroCopy({ className, model, onSelectTarget = undefined, activeTargetId = "" }) {
  return (
    <div className={className}>
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
  );
}

TemplateHeroCopy.propTypes = {
  className: PropTypes.string.isRequired,
  model: PropTypes.shape({
    hero: PropTypes.shape({
      eyebrow: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};

export function TemplateAvailabilityCalendar({
  model,
  onSelectTarget = undefined,
  activeTargetId = "",
  variant = "default",
  propertyTitle = "",
  templateKey = "",
}) {
  const titleInteractiveTargetProps = getInteractiveTargetProps("", onSelectTarget, {
    sectionId: "calendar",
    targetId: "calendar.title",
  }, activeTargetId);
  const descriptionInteractiveTargetProps = getInteractiveTargetProps("", onSelectTarget, {
    sectionId: "calendar",
    targetId: "calendar.description",
  }, activeTargetId);

  return (
    <Suspense
      fallback={
        <div
          className={styles.availabilityCalendarDeferredFallback}
          aria-hidden="true"
        />
      }
    >
      <LazyAvailabilityCalendarPreview
        availability={model.availability}
        calendarSection={model.calendarSection}
        titleInteractiveTargetProps={titleInteractiveTargetProps}
        descriptionInteractiveTargetProps={descriptionInteractiveTargetProps}
        templateKey={templateKey}
        variant={variant}
        propertyTitle={propertyTitle}
        interactiveTargetProps={getInteractiveTargetProps(styles.availabilityCalendarTarget, onSelectTarget, {
          sectionId: "calendar",
          targetId: "calendar.visibility",
        }, activeTargetId)}
      />
    </Suspense>
  );
}

TemplateAvailabilityCalendar.propTypes = {
  model: PropTypes.shape({
    availability: PropTypes.shape({}).isRequired,
    calendarSection: PropTypes.shape({}),
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
  variant: PropTypes.oneOf(["default", "panorama"]),
  propertyTitle: PropTypes.string,
  templateKey: PropTypes.string,
};

export function TemplateImageSlotVisual({
  alt,
  model,
  slot,
  imageClassName,
  frameClassName = "",
  enableHoverEffect = false,
  onSelectTarget = undefined,
  onActivate = undefined,
  activeTargetId = "",
  rotationIntervalMs = DEFAULT_IMAGE_SLOT_ROTATION_INTERVAL_MS,
  fadeDurationMs = DEFAULT_IMAGE_SLOT_FADE_DURATION_MS,
  sourceVariantPreference = "default",
}) {
  const imageSlotTarget = buildWebsiteImageSlotTarget(slot);
  const sourceVariantPreferenceKey = String(sourceVariantPreference || "").trim().toLowerCase();
  const shouldPreferOriginalHeroSource =
    slot?.kind === "hero" && sourceVariantPreferenceKey === "original-first";
  const preferredHeroAssetKey = JSON.stringify(
    shouldPreferOriginalHeroSource
      ? [
          model?.media?.heroImageAsset?.src,
          model?.media?.heroImageAsset?.webSrc,
          model?.media?.heroImageAsset?.originalSrc,
          model?.media?.heroImageAsset?.thumbSrc,
        ]
      : []
  );
  const preferredGalleryAssetKey = JSON.stringify(
    shouldPreferOriginalHeroSource
      ? (Array.isArray(model?.media?.galleryImageAssets) ? model.media.galleryImageAssets : []).map(
          (imageAsset) => [
            imageAsset?.src,
            imageAsset?.webSrc,
            imageAsset?.originalSrc,
            imageAsset?.thumbSrc,
          ]
        )
      : []
  );
  const preferredHeroImageSequence = React.useMemo(
    () =>
      shouldPreferOriginalHeroSource
        ? buildPreferredHeroImageSequence(model, ORIGINAL_FIRST_IMAGE_SOURCE_ORDER)
        : [],
    [
      model?.media?.heroImage,
      model?.media?.galleryImages,
      preferredGalleryAssetKey,
      preferredHeroAssetKey,
      shouldPreferOriginalHeroSource,
    ]
  );
  const {
    activeImageIndex,
    imageSequence,
    isRotationEnabled,
  } = useWebsiteImageSlotRotation(slot, model?.media, rotationIntervalMs, preferredHeroImageSequence);
  const isInteractivePreview = Boolean(onSelectTarget);
  const buildInteractiveProps = (className) =>
    getInteractiveTargetProps(
      className,
      onSelectTarget,
      imageSlotTarget,
      activeTargetId,
      onActivate
        ? (event) => {
            onActivate(event, imageSlotTarget);
          }
        : undefined
    );

  if (imageSequence.length < 1) {
    return null;
  }

  if (!frameClassName && !isRotationEnabled && !enableHoverEffect) {
    return (
      <img
        {...buildInteractiveProps(imageClassName)}
        src={imageSequence[0]}
        alt={alt}
        {...buildResponsiveImageProps({
          slot,
          model,
          isRotationEnabled: false,
          isInteractivePreview,
          disableResponsiveImageVariants: shouldPreferOriginalHeroSource,
        })}
        {...buildImageLoadingProps({
          slot,
          imageIndex: 0,
          isRotationEnabled: false,
          isInteractivePreview,
        })}
      />
    );
  }

  if (!isRotationEnabled) {
    return (
      <div
        {...buildInteractiveProps(
          buildImageSlotFrameClassName({
            frameClassName,
            imageClassName,
            enableHoverEffect,
          })
        )}
      >
        <img
          src={imageSequence[0]}
          alt={alt}
          className={buildImageSlotImageClassName(imageClassName, enableHoverEffect)}
          {...buildResponsiveImageProps({
            slot,
            model,
            isRotationEnabled: false,
            isInteractivePreview,
            disableResponsiveImageVariants: shouldPreferOriginalHeroSource,
          })}
          {...buildImageLoadingProps({
            slot,
            imageIndex: 0,
            isRotationEnabled: false,
            isInteractivePreview,
          })}
        />
      </div>
    );
  }

  return (
    <div
      {...buildInteractiveProps(
        buildImageSlotFrameClassName({
          frameClassName,
          imageClassName,
          enableHoverEffect,
        })
      )}
      style={{
        "--template-image-slot-fade-duration-ms": `${fadeDurationMs}ms`,
      }}
    >
      {imageSequence.map((imageUrl, index) => (
        <img
          key={`${slot.kind}-${slot.index ?? 0}-${index}-${imageUrl}`}
          src={imageUrl}
          alt={index === activeImageIndex ? alt : ""}
          aria-hidden={index === activeImageIndex ? undefined : "true"}
          {...buildImageLoadingProps({
            slot,
            imageIndex: index,
            isRotationEnabled,
            isInteractivePreview,
          })}
          className={`${styles.templateRotatingImageLayer} ${buildImageSlotImageClassName(
            imageClassName,
            enableHoverEffect
          )} ${
            index === activeImageIndex ? styles.templateRotatingImageLayerActive : ""
          }`.trim()}
        />
      ))}
    </div>
  );
}

TemplateImageSlotVisual.propTypes = {
  alt: PropTypes.string.isRequired,
  model: PropTypes.shape({
    media: PropTypes.shape({}).isRequired,
  }).isRequired,
  slot: PropTypes.shape({
    kind: PropTypes.oneOf(["hero", "residence", "gallery"]).isRequired,
    index: PropTypes.number,
  }).isRequired,
  enableHoverEffect: PropTypes.bool,
  imageClassName: PropTypes.string.isRequired,
  frameClassName: PropTypes.string,
  onSelectTarget: PropTypes.func,
  onActivate: PropTypes.func,
  activeTargetId: PropTypes.string,
  rotationIntervalMs: PropTypes.number,
  fadeDurationMs: PropTypes.number,
  sourceVariantPreference: PropTypes.oneOf(["default", "original-first"]),
};

export function TemplateSoftCallout({
  className,
  model,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  return (
    <div
      {...getInteractiveTargetProps(className, onSelectTarget, {
        sectionId: "common",
        targetId: "common.ctaLabel",
      }, activeTargetId)}
    >
      <strong>{model.callToAction.label}</strong>
      <p>{model.callToAction.note}</p>
    </div>
  );
}

TemplateSoftCallout.propTypes = {
  className: PropTypes.string.isRequired,
  model: PropTypes.shape({
    callToAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
      note: PropTypes.string,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};

