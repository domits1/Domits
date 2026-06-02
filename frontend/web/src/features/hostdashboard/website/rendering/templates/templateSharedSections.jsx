import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import AvailabilityCalendarPreview from "../AvailabilityCalendarPreview";
import {
  buildWebsiteImageSlotTarget,
  useWebsiteImageSlotRotation,
} from "../websiteImageSlotUtils";

const DEFAULT_IMAGE_SLOT_ROTATION_INTERVAL_MS = 3600;
const DEFAULT_IMAGE_SLOT_FADE_DURATION_MS = 720;

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

export const getInteractiveTargetProps = (className, onSelectTarget, target, activeTargetId = "") => {
  const targetId = target?.targetId || "";

  if (!onSelectTarget) {
    return {
      className,
      "data-preview-target-id": targetId || undefined,
    };
  }

  const isActiveTarget = targetId && targetId === activeTargetId;
  const handleActivate = (event) => {
    event?.stopPropagation?.();
    onSelectTarget(target);
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
    <AvailabilityCalendarPreview
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
  activeTargetId = "",
  rotationIntervalMs = DEFAULT_IMAGE_SLOT_ROTATION_INTERVAL_MS,
  fadeDurationMs = DEFAULT_IMAGE_SLOT_FADE_DURATION_MS,
}) {
  const imageSlotTarget = buildWebsiteImageSlotTarget(slot);
  const {
    activeImageIndex,
    imageSequence,
    isRotationEnabled,
  } = useWebsiteImageSlotRotation(slot, model?.media, rotationIntervalMs);

  if (imageSequence.length < 1) {
    return null;
  }

  if (!frameClassName && !isRotationEnabled && !enableHoverEffect) {
    return (
      <img
        {...getInteractiveTargetProps(imageClassName, onSelectTarget, imageSlotTarget, activeTargetId)}
        src={imageSequence[0]}
        alt={alt}
      />
    );
  }

  if (!isRotationEnabled) {
    return (
      <div
        {...getInteractiveTargetProps(
          buildImageSlotFrameClassName({
            frameClassName,
            imageClassName,
            enableHoverEffect,
          }),
          onSelectTarget,
          imageSlotTarget,
          activeTargetId
        )}
      >
        <img
          src={imageSequence[0]}
          alt={alt}
          className={buildImageSlotImageClassName(imageClassName, enableHoverEffect)}
        />
      </div>
    );
  }

  return (
    <div
      {...getInteractiveTargetProps(
        buildImageSlotFrameClassName({
          frameClassName,
          imageClassName,
          enableHoverEffect,
        }),
        onSelectTarget,
        imageSlotTarget,
        activeTargetId
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
          className={`${styles.templateRotatingImageLayer} ${buildImageSlotImageClassName(
            "",
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
  activeTargetId: PropTypes.string,
  rotationIntervalMs: PropTypes.number,
  fadeDurationMs: PropTypes.number,
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

