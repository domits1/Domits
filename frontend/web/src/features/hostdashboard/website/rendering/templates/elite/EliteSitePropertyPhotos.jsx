import React, { useMemo } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import EliteGalleryPage from "./EliteGalleryPage";
import { listElitePropertyPhotoSlots } from "./eliteSitePageContent";

export default function EliteSitePropertyPhotos({
  model,
  title,
  propertyHref,
  onOpenGalleryBrowser,
  canOpenGalleryBrowser,
}) {
  const stillPhotoModel = useMemo(() => ({ ...model, media: { ...model.media, imageRotation: {} } }), [model]);
  const photoViewState = useMemo(
    () => ({ showGallerySection: true, gallerySlots: listElitePropertyPhotoSlots(model.media, title) }),
    [model.media, title]
  );

  return (
    <>
      {photoViewState.gallerySlots.length > 0 ? (
        <EliteGalleryPage
          model={stillPhotoModel}
          viewState={photoViewState}
          onOpenGalleryBrowser={onOpenGalleryBrowser}
          canOpenGalleryBrowser={canOpenGalleryBrowser}
        />
      ) : (
        <section className={`${styles.eliteSection} ${styles.eliteGallery}`}>
          <p className={styles.eliteDescriptionParagraph}>This property has no photos yet.</p>
        </section>
      )}
      <section className={`${styles.eliteSection} ${styles.eliteClosing}`}>
        <h2 className={`${styles.eliteHeading} ${styles.eliteClosingHeading}`}>Like what you see?</h2>
        <PanoramaPageLink href={propertyHref} className={styles.eliteButton}>
          {`Back to ${title}`}
        </PanoramaPageLink>
      </section>
    </>
  );
}

EliteSitePropertyPhotos.propTypes = {
  model: PropTypes.shape({ media: PropTypes.object.isRequired }).isRequired,
  title: PropTypes.string.isRequired,
  propertyHref: PropTypes.string.isRequired,
  onOpenGalleryBrowser: PropTypes.func.isRequired,
  canOpenGalleryBrowser: PropTypes.bool.isRequired,
};
