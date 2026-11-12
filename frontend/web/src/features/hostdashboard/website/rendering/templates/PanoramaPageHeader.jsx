import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteTemplatePreview.module.scss";

export default function PanoramaPageHeader({ title, siteTitle, headerRef, showTopBar }) {
  return (
    <header
      ref={headerRef}
      data-panorama-page-header="true"
      className={`${styles.panoramaPageHeader} ${showTopBar ? styles.panoramaPageHeaderWithTopBar : ""}`.trim()}>
      <p className={styles.panoramaPageHeaderEyebrow}>{siteTitle}</p>
      <h1 className={styles.panoramaPageHeaderTitle}>{title}</h1>
    </header>
  );
}

PanoramaPageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  siteTitle: PropTypes.string,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
  showTopBar: PropTypes.bool.isRequired,
};
