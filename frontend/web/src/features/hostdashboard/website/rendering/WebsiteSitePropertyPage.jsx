import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { WebsiteTemplateSurface } from "./WebsiteTemplatePreview";
import { normalizeSitePages } from "./websitePages";
import { SITE_PROPERTY_PAGE_KINDS, buildSitePropertyHref } from "./websiteSiteProperties";

const ACCOMMODATION_PAGE_KEY = "accommodation";

const buildAccommodationPageModel = (model, property) => ({
  ...model,
  sitePages: {
    ...normalizeSitePages(model.sitePages),
    [ACCOMMODATION_PAGE_KEY]: { enabled: true, navLabel: model.hero.title },
  },
  visibility: property.isMainProperty ? model.visibility : { ...model.visibility, availabilityCalendar: false },
});

function SitePropertyAccommodationPage({ templateId, model, property, quoteContext, pageBasePath, pageSearch }) {
  const pageModel = useMemo(() => buildAccommodationPageModel(model, property), [model, property]);

  return (
    <WebsiteTemplateSurface
      templateId={templateId}
      model={pageModel}
      showContactWidget={pageModel.visibility?.chatWidget ?? true}
      showBrowserChrome={false}
      enableScrollReveal={templateId === "panorama-landing"}
      quoteContext={property.isMainProperty ? quoteContext : null}
      activePageKey={ACCOMMODATION_PAGE_KEY}
      pageBasePath={pageBasePath}
      pageSearch={pageSearch}
      currentPageHref={buildSitePropertyHref(
        pageBasePath,
        property.slug,
        SITE_PROPERTY_PAGE_KINDS.property,
        pageSearch
      )}
    />
  );
}

export const SITE_PROPERTY_PAGES = Object.freeze({
  [SITE_PROPERTY_PAGE_KINDS.property]: SitePropertyAccommodationPage,
  [SITE_PROPERTY_PAGE_KINDS.photos]: SitePropertyAccommodationPage,
  [SITE_PROPERTY_PAGE_KINDS.request]: SitePropertyAccommodationPage,
});

const sitePropertyPagePropTypes = {
  templateId: PropTypes.string.isRequired,
  model: PropTypes.shape({
    hero: PropTypes.shape({ title: PropTypes.string }).isRequired,
    visibility: PropTypes.shape({ chatWidget: PropTypes.bool }),
    sitePages: PropTypes.object,
  }).isRequired,
  property: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    isMainProperty: PropTypes.bool.isRequired,
  }).isRequired,
  quoteContext: PropTypes.shape({ siteId: PropTypes.string }),
  pageBasePath: PropTypes.string.isRequired,
  pageSearch: PropTypes.string.isRequired,
};

SitePropertyAccommodationPage.propTypes = sitePropertyPagePropTypes;

export default function WebsiteSitePropertyPage({
  pageKind,
  templateId,
  model,
  property,
  quoteContext = null,
  pageBasePath,
  pageSearch,
}) {
  const SitePropertyPage = SITE_PROPERTY_PAGES[pageKind];

  return (
    <SitePropertyPage
      templateId={templateId}
      model={model}
      property={property}
      quoteContext={quoteContext}
      pageBasePath={pageBasePath}
      pageSearch={pageSearch}
    />
  );
}

WebsiteSitePropertyPage.propTypes = {
  ...sitePropertyPagePropTypes,
  pageKind: PropTypes.oneOf(Object.values(SITE_PROPERTY_PAGE_KINDS)).isRequired,
};
