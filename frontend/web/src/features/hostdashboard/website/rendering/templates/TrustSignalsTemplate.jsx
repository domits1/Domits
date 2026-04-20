import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
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

export default function TrustSignalsTemplate({ model, onSelectTarget }) {
  const showTopBar = model.visibility?.topBar !== false;
  const showTrustCards = model.visibility?.trustCards !== false;
  const showAvailabilityCalendar = model.visibility?.availabilityCalendar !== false;
  const showCallToAction = model.visibility?.callToAction !== false;

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
          <div className={styles.templateTopBarMeta}>
            {model.stay.minimumStayLabel ? <span>{model.stay.minimumStayLabel}</span> : null}
            {model.location.label ? <span>{model.location.label}</span> : null}
          </div>
        </div>
      ) : null}

      <section className={styles.trustSignalsShell}>
        <div
          className={styles.trustSignalsIntro}
        >
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

        <img
          {...getInteractiveTargetProps(styles.trustSignalsHeroImage, onSelectTarget, {
            sectionId: "images",
            targetId: "images.hero",
            imageSlot: { kind: "hero" },
          })}
          src={model.media.heroImage}
          alt={model.hero.title}
        />

        {showTrustCards ? (
          <div className={styles.trustSignalsStack}>
            {model.trustCards.slice(0, 2).map((card, index) => (
              <article
                key={card.id}
                {...getInteractiveTargetProps(styles.trustSignalsCard, onSelectTarget, {
                  sectionId: "trustCards",
                  targetId: `trustCards.${index}`,
                })}
              >
                <div className={styles.trustSignalsCardMeta}>
                  <span />
                  <span />
                  <span />
                </div>
                <p className={styles.signalTitle}>{card.title}</p>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
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

        {showCallToAction ? (
          <div className={styles.trustSignalsFooter}>
            <div
              {...getInteractiveTargetProps(styles.softCallout, onSelectTarget, {
                sectionId: "common",
                targetId: "common.ctaLabel",
              })}
            >
              <strong>{model.callToAction.label}</strong>
              <p>{model.callToAction.note}</p>
            </div>
          </div>
        ) : null}
      </section>
    </article>
  );
}

TrustSignalsTemplate.propTypes = {
  model: PropTypes.shape({
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
    hero: PropTypes.shape({
      eyebrow: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
    }).isRequired,
    media: PropTypes.shape({
      heroImage: PropTypes.string,
    }).isRequired,
    trustCards: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ).isRequired,
    stay: PropTypes.shape({
      minimumStayLabel: PropTypes.string,
    }).isRequired,
    location: PropTypes.shape({
      label: PropTypes.string,
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
      trustCards: PropTypes.bool,
      availabilityCalendar: PropTypes.bool,
      callToAction: PropTypes.bool,
      chatWidget: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
};
