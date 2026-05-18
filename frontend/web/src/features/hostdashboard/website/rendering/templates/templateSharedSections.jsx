import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import AvailabilityCalendarPreview from "../AvailabilityCalendarPreview";

export const getInteractiveTargetProps = (className, onSelectTarget, target, activeTargetId = "") => {
  const targetId = target?.targetId || "";

  if (!onSelectTarget) {
    return {
      className,
      "data-preview-target-id": targetId || undefined,
    };
  }

  const isActiveTarget = targetId && targetId === activeTargetId;
  const handleActivate = () => onSelectTarget(target);

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
        handleActivate();
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

export function TemplateTopBar({ model, onSelectTarget = undefined, activeTargetId = "", children }) {
  return (
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
}) {
  return (
    <AvailabilityCalendarPreview
      availability={model.availability}
      variant={variant}
      propertyTitle={propertyTitle}
      interactiveTargetProps={getInteractiveTargetProps(styles.availabilityCalendarTarget, onSelectTarget, {
        sectionId: "visibility",
        targetId: "visibility.availabilityCalendar",
      }, activeTargetId)}
    />
  );
}

TemplateAvailabilityCalendar.propTypes = {
  model: PropTypes.shape({
    availability: PropTypes.shape({}).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
  variant: PropTypes.oneOf(["default", "panorama"]),
  propertyTitle: PropTypes.string,
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

