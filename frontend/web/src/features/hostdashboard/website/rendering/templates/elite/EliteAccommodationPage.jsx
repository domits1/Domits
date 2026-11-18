import React, { useId, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import {
  getInteractiveTargetProps,
  getPreviewTargetMarkerProps,
  TemplateImageSlotVisual,
} from "../templateSharedSections";
import EliteAvailabilityLink from "./EliteAvailabilityLink";
import EliteHouseRules from "./EliteHouseRules";
import {
  buildEliteDescription,
  buildEliteFacts,
  buildElitePrice,
  listEliteHighlights,
  listEliteHouseRules,
  resolveEliteAvailabilityLabel,
  selectEliteAccommodationPhotos,
} from "./eliteSitePageContent";

const keyTexts = (texts, prefix) => {
  let offset = 0;
  return texts.map((text) => {
    const key = `${prefix}-${offset}`;
    offset += text.length + 1;
    return { key, text };
  });
};

const renderParagraphs = (texts, prefix) =>
  keyTexts(texts, prefix).map(({ key, text }) => (
    <p key={key} className={styles.eliteDescriptionParagraph}>
      {text}
    </p>
  ));

function EliteDescription({ description, onSelectTarget, activeTargetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const moreId = useId();
  const hasMore = description.moreParagraphs.length > 0;

  return (
    <div className={styles.eliteDescription}>
      <div
        {...getInteractiveTargetProps(
          styles.eliteDescriptionText,
          onSelectTarget,
          { sectionId: "residence", targetId: "residence.description" },
          activeTargetId
        )}>
        {description.lead ? <p className={styles.eliteDescriptionLead}>{description.lead}</p> : null}
        {renderParagraphs(description.paragraphs, "shown")}
        {hasMore ? (
          <div id={moreId} hidden={!isOpen} className={styles.eliteDescriptionMore}>
            {renderParagraphs(description.moreParagraphs, "more")}
          </div>
        ) : null}
      </div>
      {hasMore ? (
        <button
          type="button"
          className={styles.eliteTextButton}
          aria-expanded={isOpen}
          aria-controls={moreId}
          onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

EliteDescription.propTypes = {
  description: PropTypes.shape({
    lead: PropTypes.string.isRequired,
    paragraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
    moreParagraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};

function ElitePriceCard({ price, availabilityHref, availabilityLabel, isInteractivePreview }) {
  return (
    <aside className={styles.elitePriceCard} aria-label="Price and availability">
      {price.amount ? (
        <p className={styles.elitePrice}>
          <span className={styles.elitePriceAmount}>{price.amount}</span>
          <span className={styles.elitePriceUnit}>per night</span>
        </p>
      ) : null}
      {availabilityHref ? (
        <EliteAvailabilityLink
          href={availabilityHref}
          label={availabilityLabel}
          isInteractivePreview={isInteractivePreview}
          className={styles.eliteButton}
        />
      ) : null}
      {price.minimumStayNote ? <p className={styles.elitePriceNote}>{price.minimumStayNote}</p> : null}
    </aside>
  );
}

ElitePriceCard.propTypes = {
  price: PropTypes.shape({ amount: PropTypes.string.isRequired, minimumStayNote: PropTypes.string.isRequired })
    .isRequired,
  availabilityHref: PropTypes.string.isRequired,
  availabilityLabel: PropTypes.string.isRequired,
  isInteractivePreview: PropTypes.bool.isRequired,
};

const buildPhotoAlt = (title, slot) =>
  slot.kind === "residence" ? `${title} residence view` : `${title} view ${slot.index + 1}`;

export default function EliteAccommodationPage({
  model,
  viewState,
  availabilityHref,
  onShowAllAmenities,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  const isInteractivePreview = Boolean(onSelectTarget);
  const facts = buildEliteFacts(model.stay);
  const description = buildEliteDescription(model.hero);
  const price = buildElitePrice(model.stay);
  const hasPriceCard = Boolean(price.amount || availabilityHref);
  const photos = selectEliteAccommodationPhotos(model.media);
  const stillPhotoModel = useMemo(() => ({ ...model, media: { ...model.media, imageRotation: {} } }), [model]);
  const highlights = viewState.showAmenitiesPanel ? listEliteHighlights(viewState.featuredAmenities) : [];
  const canShowAllAmenities = viewState.allAmenities.length > 0;
  const houseRules = listEliteHouseRules(model.policies);
  const availabilityLabel = resolveEliteAvailabilityLabel(model);

  return (
    <>
      {facts.length > 0 ? (
        <section className={`${styles.eliteSection} ${styles.eliteFactsSection}`} aria-label="Facts">
          <dl className={styles.eliteFacts}>
            {facts.map((fact) => (
              <div key={fact.id} className={styles.eliteFact}>
                <dt className={styles.eliteFactLabel}>{fact.label}</dt>
                <dd className={styles.eliteFactValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {description || hasPriceCard ? (
        <section className={`${styles.eliteSection} ${styles.eliteIntro}`}>
          {description ? (
            <EliteDescription
              description={description}
              onSelectTarget={onSelectTarget}
              activeTargetId={activeTargetId}
            />
          ) : null}
          {hasPriceCard ? (
            <ElitePriceCard
              price={price}
              availabilityHref={availabilityHref}
              availabilityLabel={availabilityLabel}
              isInteractivePreview={isInteractivePreview}
            />
          ) : null}
        </section>
      ) : null}

      {photos.length > 0 ? (
        <section className={`${styles.eliteSection} ${styles.elitePhotos}`} data-photo-count={photos.length}>
          {photos.map((slot) => (
            <TemplateImageSlotVisual
              key={`${slot.kind}-${slot.index ?? 0}`}
              model={stillPhotoModel}
              slot={slot}
              frameClassName={styles.elitePhotoFrame}
              imageClassName={styles.elitePhoto}
              alt={buildPhotoAlt(model.hero.title, slot)}
              onSelectTarget={onSelectTarget}
              activeTargetId={activeTargetId}
            />
          ))}
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section
          {...getPreviewTargetMarkerProps(
            `${styles.eliteSection} ${styles.eliteHighlights}`,
            "visibility.amenitiesPanel",
            activeTargetId
          )}>
          <div className={styles.eliteHighlightsHeading}>
            <p
              {...getInteractiveTargetProps(
                styles.eliteEyebrow,
                onSelectTarget,
                { sectionId: "amenities", targetId: "amenities.title" },
                activeTargetId
              )}>
              {model.amenitiesSection?.title || "Amenities"}
            </p>
            <h2
              {...getInteractiveTargetProps(
                styles.eliteHeading,
                onSelectTarget,
                { sectionId: "amenities", targetId: "amenities.description" },
                activeTargetId
              )}>
              {model.amenitiesSection?.description || "Every Detail Considered"}
            </h2>
          </div>
          <div className={styles.eliteHighlightsBody}>
            <ul className={styles.eliteHighlightsList}>
              {highlights.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            {canShowAllAmenities ? (
              <button
                type="button"
                className={styles.eliteTextButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onShowAllAmenities();
                }}>
                Show all
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {houseRules.length > 0 ? <EliteHouseRules rules={houseRules} /> : null}
    </>
  );
}

EliteAccommodationPage.propTypes = {
  model: PropTypes.shape({
    hero: PropTypes.shape({ title: PropTypes.string }).isRequired,
    stay: PropTypes.object.isRequired,
    media: PropTypes.object.isRequired,
    policies: PropTypes.object,
    callToAction: PropTypes.shape({ label: PropTypes.string }),
    amenitiesSection: PropTypes.shape({ title: PropTypes.string, description: PropTypes.string }),
  }).isRequired,
  viewState: PropTypes.shape({
    showAmenitiesPanel: PropTypes.bool.isRequired,
    featuredAmenities: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string })).isRequired,
    allAmenities: PropTypes.array.isRequired,
  }).isRequired,
  availabilityHref: PropTypes.string.isRequired,
  onShowAllAmenities: PropTypes.func.isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
