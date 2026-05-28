import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteEditorPage.module.scss";

const PREVIEW_SKELETON_PILLS = Array.from({ length: 4 }, (_, index) => ({
  id: `pill-${index}`,
  order: index + 4,
}));

const PREVIEW_SKELETON_GALLERY_ITEMS = Array.from({ length: 6 }, (_, index) => ({
  id: `gallery-${index}`,
  order: index + 10,
}));

const getViewportClassName = (viewport) => {
  if (viewport === "mobile") {
    return styles.previewSkeletonViewportMobile;
  }

  if (viewport === "tablet") {
    return styles.previewSkeletonViewportTablet;
  }

  return styles.previewSkeletonViewportDesktop;
};

const buildSkeletonStyle = (order) => ({
  "--preview-skeleton-order": order,
});

export const resolveWebsitePreviewSkeletonViewport = () => {
  const viewportWidth = Number(globalThis.innerWidth || 0);
  if (viewportWidth > 0 && viewportWidth <= 560) {
    return "mobile";
  }

  if (viewportWidth > 0 && viewportWidth <= 960) {
    return "tablet";
  }

  return "desktop";
};

export function WebsitePreviewSkeleton({ viewport }) {
  return (
    <div className={styles.previewSkeletonFrame}>
      <div className={`${styles.previewSkeletonViewport} ${getViewportClassName(viewport)}`.trim()}>
        <div className={styles.previewSkeletonSurface}>
          <div
            className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonHero}`.trim()}
            style={buildSkeletonStyle(0)}
          />

          <section className={styles.previewSkeletonSection}>
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonEyebrow}`.trim()}
              style={buildSkeletonStyle(1)}
            />
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonHeading}`.trim()}
              style={buildSkeletonStyle(2)}
            />
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonLine}`.trim()}
              style={buildSkeletonStyle(3)}
            />
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonLineShort}`.trim()}
              style={buildSkeletonStyle(3)}
            />
          </section>

          <section className={styles.previewSkeletonPillRow}>
            {PREVIEW_SKELETON_PILLS.map(({ id, order }) => (
              <div
                key={id}
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonPill}`.trim()}
                style={buildSkeletonStyle(order)}
              />
            ))}
          </section>

          <section className={styles.previewSkeletonSplitSection}>
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonMediaCard}`.trim()}
              style={buildSkeletonStyle(6)}
            />
            <div className={styles.previewSkeletonCopyColumn}>
              <div
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonEyebrow}`.trim()}
                style={buildSkeletonStyle(7)}
              />
              <div
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonHeadingMedium}`.trim()}
                style={buildSkeletonStyle(8)}
              />
              <div
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonLine}`.trim()}
                style={buildSkeletonStyle(9)}
              />
              <div
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonLine}`.trim()}
                style={buildSkeletonStyle(9)}
              />
              <div
                className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonLineShort}`.trim()}
                style={buildSkeletonStyle(9)}
              />
            </div>
          </section>

          <section className={styles.previewSkeletonSection}>
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonEyebrow}`.trim()}
              style={buildSkeletonStyle(10)}
            />
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonHeadingMedium}`.trim()}
              style={buildSkeletonStyle(11)}
            />
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonButton}`.trim()}
              style={buildSkeletonStyle(12)}
            />
            <div className={styles.previewSkeletonGalleryGrid}>
              {PREVIEW_SKELETON_GALLERY_ITEMS.map(({ id, order }) => (
                <div
                  key={id}
                  className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonGalleryCard}`.trim()}
                  style={buildSkeletonStyle(order)}
                />
              ))}
            </div>
          </section>

          <section className={styles.previewSkeletonFooterSection}>
            <div
              className={`${styles.previewSkeletonPiece} ${styles.previewSkeletonFooterCard}`.trim()}
              style={buildSkeletonStyle(16)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

WebsitePreviewSkeleton.propTypes = {
  viewport: PropTypes.oneOf(["desktop", "tablet", "mobile"]).isRequired,
};
