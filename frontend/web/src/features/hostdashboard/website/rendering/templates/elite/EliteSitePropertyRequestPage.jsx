import React, { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import ElitePageHeader from "./ElitePageHeader";
import EliteFooter from "./EliteFooter";
import { resolveEliteLocation } from "./eliteSitePageContent";
import { sitePropertyPagePropType } from "../templatePropTypes";

const LazyRequestContent = lazy(() => import("./EliteSitePropertyRequestContent"));

export default function EliteSitePropertyRequestPage({ sitePropertyPage, headerTone, model, viewState, headerRef }) {
  const { key: locationKey } = useLocation();
  const { title, overviewHref, propertyHref, sentHref, booking, stay, rules, buildRequestHref } = sitePropertyPage;
  const location = resolveEliteLocation(model);

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page="request">
      <ElitePageHeader
        title="Request to book"
        eyebrow={
          <>
            <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
              Our properties
            </PanoramaPageLink>
            {" / "}
            <PanoramaPageLink href={propertyHref} className={styles.eliteCrumbLink}>
              {title}
            </PanoramaPageLink>
          </>
        }
        tone={headerTone}
        model={model}
        headerRef={headerRef}
        showTopBar={viewState.showTopBar}
      />
      <section className={`${styles.eliteSection} ${styles.eliteBookingPanel} ${requestStyles.request}`}>
        {booking ? (
          <Suspense fallback={null}>
            <LazyRequestContent
              key={locationKey}
              model={model}
              title={title}
              booking={booking}
              stay={stay}
              rules={rules}
              propertyHref={propertyHref}
              overviewHref={overviewHref}
              sentHref={sentHref}
              buildRequestHref={buildRequestHref}
            />
          </Suspense>
        ) : (
          <div className={requestStyles.main}>
            <p role="alert">Online booking isn&apos;t available for this site right now.</p>
            <PanoramaPageLink href={propertyHref} className={styles.eliteButton}>
              {`Back to ${title}`}
            </PanoramaPageLink>
          </div>
        )}
      </section>
      <EliteFooter title={model.site.title} location={location} />
    </div>
  );
}

EliteSitePropertyRequestPage.propTypes = {
  sitePropertyPage: sitePropertyPagePropType.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({
    site: PropTypes.shape({ title: PropTypes.string }).isRequired,
    media: PropTypes.object.isRequired,
  }).isRequired,
  viewState: PropTypes.shape({ showTopBar: PropTypes.bool.isRequired }).isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
};
