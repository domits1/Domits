import React, { Suspense, lazy, useCallback, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import ElitePageHeader from "./ElitePageHeader";
import EliteFooter from "./EliteFooter";
import { resolveEliteLocation } from "./eliteSitePageContent";
import { sitePropertyPagePropType } from "../templatePropTypes";

const LazyRequestContent = lazy(() => import("./EliteSitePropertyRequestContent"));

export default function EliteSitePropertyRequestPage({ sitePropertyPage, headerTone, model, viewState, headerRef }) {
  const { title, overviewHref, propertyHref, booking, stay } = sitePropertyPage;
  const [isSent, setIsSent] = useState(false);
  const markSent = useCallback(() => setIsSent(true), []);
  const location = resolveEliteLocation(model);

  return (
    <div
      className={`${styles.elitePage} ${viewState.showTopBar ? styles.elitePageWithTopBar : ""}`.trim()}
      data-elite-page="request">
      <ElitePageHeader
        title={isSent ? "Your request has been sent" : "Request to book"}
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
      <section className={`${styles.eliteSection} ${requestStyles.request}`}>
        <Suspense fallback={null}>
          <LazyRequestContent
            model={model}
            title={title}
            booking={booking}
            stay={stay}
            propertyHref={propertyHref}
            overviewHref={overviewHref}
            onSent={markSent}
          />
        </Suspense>
      </section>
      <EliteFooter title={model.site.title} location={location} />
    </div>
  );
}

EliteSitePropertyRequestPage.propTypes = {
  sitePropertyPage: sitePropertyPagePropType.isRequired,
  headerTone: PropTypes.oneOf(["photo", "light"]).isRequired,
  model: PropTypes.shape({ site: PropTypes.object.isRequired, media: PropTypes.object.isRequired }).isRequired,
  viewState: PropTypes.shape({ showTopBar: PropTypes.bool.isRequired }).isRequired,
  headerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]).isRequired,
};
