import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import ElitePageHeader from "./ElitePageHeader";
import EliteAccommodationPage from "./EliteAccommodationPage";
import EliteAvailabilityLink from "./EliteAvailabilityLink";
import EliteContactPage from "./EliteContactPage";
import EliteGalleryPage from "./EliteGalleryPage";
import { resolveEliteAvailabilityLabel, resolveEliteGalleryIntro, resolveEliteLocation } from "./eliteSitePageContent";
import { getDefaultWebsiteCalendarTitle } from "../../../config/websiteCalendarSectionConfig";

function EliteClosingCallToAction({ model, availabilityHref, isInteractivePreview }) {
  const heading =
    String(model.calendarSection?.title || "").trim() || getDefaultWebsiteCalendarTitle("panorama-landing");

  return (
    <section className={`${styles.eliteSection} ${styles.eliteClosing}`} aria-label={heading}>
      <h2 className={`${styles.eliteHeading} ${styles.eliteClosingHeading}`}>{heading}</h2>
      <EliteAvailabilityLink
        href={availabilityHref}
        label={resolveEliteAvailabilityLabel(model)}
        isInteractivePreview={isInteractivePreview}
        className={styles.eliteButton}
      />
    </section>
  );
}

EliteClosingCallToAction.propTypes = {
  model: PropTypes.shape({ calendarSection: PropTypes.shape({ title: PropTypes.string }) }).isRequired,
  availabilityHref: PropTypes.string.isRequired,
  isInteractivePreview: PropTypes.bool.isRequired,
};

export default function PanoramaEliteSitePage({
  pageKey,
  pageTitle,
  headerTone,
  model,
  viewState,
  availabilityHref,
  headerRef,
  onShowAllAmenities,
  onOpenGalleryBrowser,
  canOpenGalleryBrowser,
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  const location = resolveEliteLocation(model);
  const isInteractivePreview = Boolean(onSelectTarget);
  const showsClosingCallToAction = pageKey !== "accommodation" && Boolean(availabilityHref);
  const showsGalleryIntro = pageKey === "gallery" && viewState.showGallerySection;

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page={pageKey}>
      <ElitePageHeader
        title={pageTitle}
        eyebrow={location}
        intro={showsGalleryIntro ? resolveEliteGalleryIntro(model.gallerySection) : ""}
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
        onSelectTarget={onSelectTarget}
        activeTargetId={activeTargetId}
      />
      {pageKey === "accommodation" ? (
        <EliteAccommodationPage
          model={model}
          viewState={viewState}
          availabilityHref={availabilityHref}
          onShowAllAmenities={onShowAllAmenities}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      ) : null}
      {pageKey === "gallery" ? (
        <EliteGalleryPage
          model={model}
          viewState={viewState}
          onOpenGalleryBrowser={onOpenGalleryBrowser}
          canOpenGalleryBrowser={canOpenGalleryBrowser}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      ) : null}
      {pageKey === "contact" ? (
        <EliteContactPage
          model={model}
          viewState={viewState}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
        />
      ) : null}
      {showsClosingCallToAction ? (
        <EliteClosingCallToAction
          model={model}
          availabilityHref={availabilityHref}
          isInteractivePreview={isInteractivePreview}
        />
      ) : null}
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
  pageKey: PropTypes.oneOf(["accommodation", "gallery", "contact"]).isRequired,
  pageTitle: PropTypes.string.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({
    site: PropTypes.shape({ title: PropTypes.string }).isRequired,
    gallerySection: PropTypes.shape({ description: PropTypes.string }),
  }).isRequired,
  viewState: PropTypes.shape({
    showTopBar: PropTypes.bool.isRequired,
    showGallerySection: PropTypes.bool.isRequired,
  }).isRequired,
  availabilityHref: PropTypes.string.isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
  onShowAllAmenities: PropTypes.func.isRequired,
  onOpenGalleryBrowser: PropTypes.func.isRequired,
  canOpenGalleryBrowser: PropTypes.bool.isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
