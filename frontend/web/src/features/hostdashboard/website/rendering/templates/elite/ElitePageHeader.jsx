import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import { TemplateImageSlotVisual } from "../templateSharedSections";

export default function ElitePageHeader({
  title,
  eyebrow,
  tone,
  model,
  headerRef,
  showTopBar,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  return (
    <header
      ref={headerRef}
      data-panorama-page-header="true"
      data-elite-header={tone}
      className={`${styles.eliteHeader} ${tone === "photo" ? styles.eliteHeaderPhoto : styles.eliteHeaderLight} ${
        showTopBar ? styles.eliteHeaderWithTopBar : ""
      }`.trim()}>
      {tone === "photo" ? (
        <TemplateImageSlotVisual
          model={model}
          slot={{ kind: "hero", sectionId: "common" }}
          frameClassName={styles.eliteHeaderPhotoFrame}
          imageClassName={styles.eliteHeaderPhotoImage}
          sourceVariantPreference="original-first"
          alt=""
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      ) : null}
      <div className={`${styles.eliteSection} ${styles.eliteHeaderInner}`}>
        <div className={styles.eliteHeaderCopy}>
          {eyebrow ? <p className={styles.eliteEyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.eliteHeaderTitle}>{title}</h1>
        </div>
      </div>
    </header>
  );
}

ElitePageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  eyebrow: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({ media: PropTypes.object.isRequired }).isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
  showTopBar: PropTypes.bool.isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
