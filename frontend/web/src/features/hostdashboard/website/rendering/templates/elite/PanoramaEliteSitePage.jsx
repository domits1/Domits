import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import ElitePageHeader from "./ElitePageHeader";
import EliteAccommodationPage from "./EliteAccommodationPage";
import { resolveEliteLocation } from "./eliteSitePageContent";

export default function PanoramaEliteSitePage({
  pageKey,
  pageTitle,
  headerTone,
  model,
  viewState,
  availabilityHref,
  headerRef,
  onShowAllAmenities,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  const location = resolveEliteLocation(model);

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page={pageKey}>
      <ElitePageHeader
        title={pageTitle}
        eyebrow={location}
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
        onSelectTarget={onSelectTarget}
        activeTargetId={activeTargetId}
      />
      <EliteAccommodationPage
        model={model}
        viewState={viewState}
        availabilityHref={availabilityHref}
        onShowAllAmenities={onShowAllAmenities}
        onSelectTarget={onSelectTarget}
        activeTargetId={activeTargetId}
      />
      <footer className={styles.eliteFooter}>
        <div className={`${styles.eliteSection} ${styles.eliteFooterInner}`}>
          <span className={styles.eliteFooterName}>{model.site.title}</span>
          {location ? <span>{location}</span> : null}
        </div>
      </footer>
    </div>
  );
}

PanoramaEliteSitePage.propTypes = {
  pageKey: PropTypes.oneOf(["accommodation"]).isRequired,
  pageTitle: PropTypes.string.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({
    site: PropTypes.shape({ title: PropTypes.string }).isRequired,
  }).isRequired,
  viewState: PropTypes.shape({ showTopBar: PropTypes.bool.isRequired }).isRequired,
  availabilityHref: PropTypes.string.isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
  onShowAllAmenities: PropTypes.func.isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
