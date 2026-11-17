import React, { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import ElitePageHeader from "./ElitePageHeader";
import EliteAccommodationPage from "./EliteAccommodationPage";
import EliteFooter from "./EliteFooter";
import EliteSitePropertyPhotos from "./EliteSitePropertyPhotos";
import { resolveEliteLocation } from "./eliteSitePageContent";
import { sitePropertyPagePropType } from "../templatePropTypes";
import { SITE_PROPERTY_PAGE_KINDS } from "../../websiteSiteProperties";

const LazyBookingPanel = lazy(() => import("./EliteSitePropertyBookingPanel"));

export default function EliteSitePropertyPage({
  sitePropertyPage,
  headerTone,
  model,
  viewState,
  headerRef,
  onShowAllAmenities,
  onOpenGalleryBrowser,
  canOpenGalleryBrowser,
}) {
  const { kind, title, overviewHref, propertyHref, booking, stay, buildRequestHref } = sitePropertyPage;
  const isPhotosPage = kind === SITE_PROPERTY_PAGE_KINDS.photos;
  const location = resolveEliteLocation(model);
  const overviewLink = (
    <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
      Our properties
    </PanoramaPageLink>
  );
  const photosEyebrow = (
    <>
      {overviewLink}
      {" / "}
      <PanoramaPageLink href={propertyHref} className={styles.eliteCrumbLink}>
        {title}
      </PanoramaPageLink>
      {" / Photos"}
    </>
  );
  const propertyEyebrow = (
    <>
      {overviewLink}
      {location ? ` / ${location}` : null}
    </>
  );
  const bookingPanel = booking ? (
    <Suspense fallback={null}>
      <LazyBookingPanel
        key={booking.key}
        model={model}
        siteId={booking.siteId}
        propertyId={booking.propertyId}
        initialStay={stay}
        buildRequestHref={buildRequestHref}
      />
    </Suspense>
  ) : null;

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page={isPhotosPage ? "property-photos" : "property"}>
      <ElitePageHeader
        title={isPhotosPage ? `Photos of ${title}` : title}
        eyebrow={isPhotosPage ? photosEyebrow : propertyEyebrow}
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
      />
      {isPhotosPage ? (
        <EliteSitePropertyPhotos
          model={model}
          title={title}
          propertyHref={propertyHref}
          onOpenGalleryBrowser={onOpenGalleryBrowser}
          canOpenGalleryBrowser={canOpenGalleryBrowser}
        />
      ) : (
        <EliteAccommodationPage
          model={model}
          viewState={viewState}
          availabilityHref=""
          onShowAllAmenities={onShowAllAmenities}
          bookingPanel={bookingPanel}
        />
      )}
      <EliteFooter title={model.site.title} location={location} />
    </div>
  );
}

EliteSitePropertyPage.propTypes = {
  sitePropertyPage: sitePropertyPagePropType.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({
    site: PropTypes.shape({ title: PropTypes.string }).isRequired,
    media: PropTypes.object.isRequired,
  }).isRequired,
  viewState: PropTypes.shape({ showTopBar: PropTypes.bool.isRequired }).isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
  onShowAllAmenities: PropTypes.func.isRequired,
  onOpenGalleryBrowser: PropTypes.func.isRequired,
  canOpenGalleryBrowser: PropTypes.bool.isRequired,
};
