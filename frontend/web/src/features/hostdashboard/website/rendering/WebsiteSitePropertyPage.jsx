import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { WebsiteTemplateSurface } from "./WebsiteTemplatePreview";
import { buildSiteHref, buildSitePageHref, normalizeSitePages } from "./websitePages";
import {
  SITE_PROPERTY_PAGE_KINDS,
  buildSitePropertyHref,
  buildSitePropertyStayQuery,
  readSitePropertyStayQuery,
} from "./websiteSiteProperties";
import { resolveQuotePanelSiteId } from "./booking/quotePanelGate";

const ACCOMMODATION_PAGE_KEY = "accommodation";
const GALLERY_PAGE_KEY = "gallery";
const CONTACT_PAGE_KEY = "contact";
const PANORAMA_TEMPLATE_ID = "panorama-landing";
const OVERVIEW_NAV_LABEL = "Our properties";

const buildAccommodationPageModel = (model, property) => ({
  ...model,
  sitePages: {
    ...normalizeSitePages(model.sitePages),
    [ACCOMMODATION_PAGE_KEY]: { enabled: true, navLabel: model.hero.title },
  },
  visibility: property.isMainProperty ? model.visibility : { ...model.visibility, availabilityCalendar: false },
});

const buildSitePropertyNavItems = ({ sitePages, overviewHref, pageBasePath, pageSearch }) => {
  const contactPage = normalizeSitePages(sitePages)[CONTACT_PAGE_KEY];
  const contactItem = {
    href: buildSitePageHref(pageBasePath, CONTACT_PAGE_KEY, pageSearch),
    label: contactPage.navLabel,
    isPageLink: true,
  };
  return [
    { href: overviewHref, label: OVERVIEW_NAV_LABEL, isPageLink: true },
    ...(contactPage.enabled ? [contactItem] : []),
  ];
};

const buildSitePropertyPage = ({ pageKind, model, property, quoteSiteId, pageBasePath, pageSearch, search }) => {
  const stay = readSitePropertyStayQuery(search);
  const staySearch = buildSitePropertyStayQuery(pageSearch, stay);
  const overviewHref = buildSiteHref(pageBasePath, [], pageSearch);

  return {
    kind: pageKind,
    pageKey: pageKind === SITE_PROPERTY_PAGE_KINDS.photos ? GALLERY_PAGE_KEY : ACCOMMODATION_PAGE_KEY,
    title: model.hero.title,
    overviewHref,
    propertyHref: buildSitePropertyHref(pageBasePath, property.slug, SITE_PROPERTY_PAGE_KINDS.property, staySearch),
    photosHref: buildSitePropertyHref(pageBasePath, property.slug, SITE_PROPERTY_PAGE_KINDS.photos, staySearch),
    navItems: buildSitePropertyNavItems({ sitePages: model.sitePages, overviewHref, pageBasePath, pageSearch }),
    stay,
    booking: quoteSiteId
      ? {
          key: `${property.propertyId}${staySearch}`,
          siteId: quoteSiteId,
          propertyId: property.isMainProperty ? "" : property.propertyId,
        }
      : null,
    buildRequestHref: (requestStay) =>
      buildSitePropertyHref(
        pageBasePath,
        property.slug,
        SITE_PROPERTY_PAGE_KINDS.request,
        buildSitePropertyStayQuery(pageSearch, requestStay)
      ),
  };
};

const buildSitePropertyRequestPage = (pageArgs) => {
  const page = buildSitePropertyPage(pageArgs);
  const { pageBasePath, pageSearch, property } = pageArgs;
  return {
    ...page,
    headerTone: "light",
    propertyHref: buildSitePropertyHref(
      pageBasePath,
      property.slug,
      SITE_PROPERTY_PAGE_KINDS.property,
      buildSitePropertyStayQuery(pageSearch, page.stay)
    ),
  };
};

function SitePropertyAccommodationPage({
  pageKind,
  templateId,
  model,
  property,
  quoteContext,
  pageBasePath,
  pageSearch,
}) {
  const pageModel = useMemo(() => buildAccommodationPageModel(model, property), [model, property]);

  return (
    <WebsiteTemplateSurface
      templateId={templateId}
      model={pageModel}
      showContactWidget={pageModel.visibility?.chatWidget ?? true}
      showBrowserChrome={false}
      enableScrollReveal={templateId === PANORAMA_TEMPLATE_ID}
      quoteContext={property.isMainProperty ? quoteContext : null}
      activePageKey={ACCOMMODATION_PAGE_KEY}
      pageBasePath={pageBasePath}
      pageSearch={pageSearch}
      currentPageHref={buildSitePropertyHref(pageBasePath, property.slug, pageKind, pageSearch)}
    />
  );
}

function SitePropertyElitePage({ pageKind, templateId, model, property, quoteContext, pageBasePath, pageSearch }) {
  const { search } = useLocation();
  const quoteSiteId = resolveQuotePanelSiteId({ quoteContext, model });
  const buildPage =
    pageKind === SITE_PROPERTY_PAGE_KINDS.request ? buildSitePropertyRequestPage : buildSitePropertyPage;
  const sitePropertyPage = useMemo(
    () => buildPage({ pageKind, model, property, quoteSiteId, pageBasePath, pageSearch, search }),
    [buildPage, model, pageBasePath, pageKind, pageSearch, property, quoteSiteId, search]
  );

  return (
    <WebsiteTemplateSurface
      key={pageKind}
      templateId={templateId}
      model={model}
      showContactWidget={model.visibility?.chatWidget ?? true}
      showBrowserChrome={false}
      enableScrollReveal
      activePageKey={sitePropertyPage.pageKey}
      pageBasePath={pageBasePath}
      pageSearch={pageSearch}
      sitePropertyPage={sitePropertyPage}
    />
  );
}

function SitePropertyPage(props) {
  const Page = props.templateId === PANORAMA_TEMPLATE_ID ? SitePropertyElitePage : SitePropertyAccommodationPage;
  return <Page {...props} />;
}

const sitePropertyPagePropTypes = {
  pageKind: PropTypes.oneOf(Object.values(SITE_PROPERTY_PAGE_KINDS)).isRequired,
  templateId: PropTypes.string.isRequired,
  model: PropTypes.shape({ hero: PropTypes.shape({ title: PropTypes.string }).isRequired }).isRequired,
  property: PropTypes.shape({
    propertyId: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    isMainProperty: PropTypes.bool.isRequired,
  }).isRequired,
  quoteContext: PropTypes.shape({ siteId: PropTypes.string }),
  pageBasePath: PropTypes.string.isRequired,
  pageSearch: PropTypes.string.isRequired,
};

SitePropertyAccommodationPage.propTypes = sitePropertyPagePropTypes;
SitePropertyElitePage.propTypes = sitePropertyPagePropTypes;
SitePropertyPage.propTypes = sitePropertyPagePropTypes;

export const SITE_PROPERTY_PAGES = Object.freeze({
  [SITE_PROPERTY_PAGE_KINDS.property]: SitePropertyPage,
  [SITE_PROPERTY_PAGE_KINDS.photos]: SitePropertyPage,
  [SITE_PROPERTY_PAGE_KINDS.request]: SitePropertyPage,
});
