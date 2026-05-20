import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";
import { getAmenityIconNode } from "../amenityIconRegistry";
import {
  getInteractiveTargetProps,
  getPreviewTargetMarkerProps,
  TemplateAvailabilityCalendar,
  TemplateHeroCopy,
  TemplateImageSlotVisual,
  TemplateSoftCallout,
  TemplateTopBar,
} from "./templateSharedSections";
import {
  availabilityPropType,
  callToActionPropType,
  copyItemPropType,
  heroPropType,
  mediaPropType,
  sitePropType,
  templateInteractionPropTypes,
  visibilityPropType,
} from "./templatePropTypes";

export default function TrustSignalsTemplate({ model, onSelectTarget, activeTargetId }) {
  const showTopBar = model.visibility?.topBar !== false;
  const showTrustCards = model.visibility?.trustCards !== false;
  const showAvailabilityCalendar = model.visibility?.availabilityCalendar !== false;
  const showCallToAction = model.visibility?.callToAction !== false;

  return (
    <article className={styles.templateSite}>
      {showTopBar ? (
        <TemplateTopBar model={model} onSelectTarget={onSelectTarget} activeTargetId={activeTargetId}>
          <div className={styles.templateTopBarMeta}>
            {model.stay.minimumStayLabel ? <span>{model.stay.minimumStayLabel}</span> : null}
            {model.location.label ? <span>{model.location.label}</span> : null}
          </div>
        </TemplateTopBar>
      ) : null}

      <section className={styles.trustSignalsShell}>
        <TemplateHeroCopy
          className={styles.trustSignalsIntro}
          model={model}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />

        <TemplateImageSlotVisual
          model={model}
          slot={{ kind: "hero" }}
          imageClassName={styles.trustSignalsHeroImage}
          alt={model.hero.title}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />

        {showTrustCards ? (
          <div
            {...getPreviewTargetMarkerProps(
              styles.trustSignalsStack,
              "visibility.trustCards",
              activeTargetId
            )}
          >
            {model.trustCards.slice(0, 2).map((card, index) => {
              const cardIcon = getAmenityIconNode(card.iconAmenityId, {
                className: styles.trustSignalsCardMetaIconGlyph,
                "aria-hidden": true,
                focusable: "false",
                sx: {
                  color: "#54703b",
                  fontSize: 20,
                  padding: 0,
                },
              });

              return (
                <article
                  key={card.id}
                  {...getInteractiveTargetProps(styles.trustSignalsCard, onSelectTarget, {
                    sectionId: "trustCards",
                    targetId: `trustCards.${index}`,
                  }, activeTargetId)}
                >
                  <div className={styles.trustSignalsCardMeta}>
                    {cardIcon ? (
                      <span className={styles.trustSignalsCardMetaIcon} aria-hidden="true">
                        {cardIcon}
                      </span>
                    ) : (
                      <>
                        <span />
                        <span />
                        <span />
                      </>
                    )}
                  </div>
                  <p className={styles.signalTitle}>{card.title}</p>
                  <p>{card.description}</p>
                </article>
              );
            })}
          </div>
        ) : null}

        {showAvailabilityCalendar ? (
          <TemplateAvailabilityCalendar
            model={model}
            onSelectTarget={onSelectTarget}
            activeTargetId={activeTargetId}
          />
        ) : null}

        {showCallToAction ? (
          <div className={styles.trustSignalsFooter}>
            <TemplateSoftCallout
              className={styles.softCallout}
              model={model}
              onSelectTarget={onSelectTarget}
              activeTargetId={activeTargetId}
            />
          </div>
        ) : null}
      </section>
    </article>
  );
}

TrustSignalsTemplate.propTypes = {
  model: PropTypes.shape({
    site: sitePropType.isRequired,
    hero: heroPropType.isRequired,
    media: mediaPropType.isRequired,
    trustCards: PropTypes.arrayOf(copyItemPropType).isRequired,
    stay: PropTypes.shape({
      minimumStayLabel: PropTypes.string,
    }).isRequired,
    location: PropTypes.shape({
      label: PropTypes.string,
    }).isRequired,
    availability: availabilityPropType.isRequired,
    callToAction: callToActionPropType.isRequired,
    visibility: visibilityPropType.isRequired,
  }).isRequired,
  ...templateInteractionPropTypes,
};
