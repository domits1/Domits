import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import { getPreviewTargetMarkerProps, TemplateImageSlotVisual } from "../templateSharedSections";
import { hasEliteGalleryPhotos, resolveEliteGalleryLayout, selectEliteGallerySlots } from "./eliteSitePageContent";

export default function EliteGalleryPage({
  model,
  viewState,
  onOpenGalleryBrowser,
  canOpenGalleryBrowser,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  const gallerySlots = viewState.showGallerySection ? selectEliteGallerySlots(viewState.gallerySlots, model.media) : [];
  if (gallerySlots.length < 1) {
    return null;
  }

  return (
    <section
      {...getPreviewTargetMarkerProps(
        `${styles.eliteSection} ${styles.eliteGallery}`,
        "gallery.visibility",
        activeTargetId
      )}
      aria-label="Photos">
      <div className={styles.eliteGalleryGrid} data-gallery-layout={resolveEliteGalleryLayout(gallerySlots.length)}>
        {gallerySlots.map((gallerySlot) => (
          <TemplateImageSlotVisual
            key={gallerySlot.key}
            model={model}
            slot={gallerySlot.slot}
            frameClassName={styles.eliteGalleryFrame}
            imageClassName={styles.eliteGalleryImage}
            alt={gallerySlot.alt}
            onSelectTarget={onSelectTarget}
            onActivate={canOpenGalleryBrowser ? () => onOpenGalleryBrowser(gallerySlot.slot.index ?? 0) : undefined}
            activeTargetId={activeTargetId}
          />
        ))}
      </div>
      {canOpenGalleryBrowser && hasEliteGalleryPhotos(model.media) ? (
        <button
          type="button"
          className={styles.eliteTextButton}
          onClick={(event) => {
            event.stopPropagation();
            onOpenGalleryBrowser(0);
          }}>
          {model.gallerySection?.browseLabel || "Browse"}
        </button>
      ) : null}
    </section>
  );
}

EliteGalleryPage.propTypes = {
  model: PropTypes.shape({
    media: PropTypes.shape({ galleryImages: PropTypes.arrayOf(PropTypes.string) }).isRequired,
    gallerySection: PropTypes.shape({ browseLabel: PropTypes.string }),
  }).isRequired,
  viewState: PropTypes.shape({
    showGallerySection: PropTypes.bool.isRequired,
    gallerySlots: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        alt: PropTypes.string.isRequired,
        slot: PropTypes.shape({ kind: PropTypes.string.isRequired, index: PropTypes.number }).isRequired,
      })
    ).isRequired,
  }).isRequired,
  onOpenGalleryBrowser: PropTypes.func.isRequired,
  canOpenGalleryBrowser: PropTypes.bool.isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
