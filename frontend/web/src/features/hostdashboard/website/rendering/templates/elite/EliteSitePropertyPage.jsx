import React, { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import ElitePageHeader from "./ElitePageHeader";
import EliteAccommodationPage from "./EliteAccommodationPage";
import EliteFooter from "./EliteFooter";
import { resolveEliteLocation } from "./eliteSitePageContent";
import { sitePropertyPagePropType } from "../templatePropTypes";

const LazyBookingPanel = lazy(() => import("./EliteSitePropertyBookingPanel"));

export default function EliteSitePropertyPage({
  sitePropertyPage,
  headerTone,
  model,
  viewState,
  headerRef,
  onShowAllAmenities,
}) {
  const { title, overviewHref, booking, stay, buildRequestHref } = sitePropertyPage;
  const location = resolveEliteLocation(model);
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
      data-elite-page="property">
      <ElitePageHeader
        title={title}
        eyebrow={
          <>
            <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
              Our properties
            </PanoramaPageLink>
            {location ? ` / ${location}` : null}
          </>
        }
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
      />
      <EliteAccommodationPage
        model={model}
        viewState={viewState}
        availabilityHref=""
        onShowAllAmenities={onShowAllAmenities}
        bookingPanel={bookingPanel}
      />
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
};
