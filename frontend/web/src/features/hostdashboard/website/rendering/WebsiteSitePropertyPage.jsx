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
const CONTACT_PAGE_KEY = "contact";
const PANORAMA_TEMPLATE_ID = "panorama-landing";
const OVERVIEW_NAV_LABEL = "Our properties";
const LIGHT_HEADER_PAGE_KINDS = new Set([SITE_PROPERTY_PAGE_KINDS.request, SITE_PROPERTY_PAGE_KINDS.sent]);

const buildAccommodationPageModel = (model, property) => ({
  ...model,
  sitePages: {
    ...normalizeSitePages(model.sitePages),
    [ACCOMMODATION_PAGE_KEY]: { enabled: true, navLabel: model.hero.title },
  },
  visibility: property.isMainProperty ? model.visibility : { ...model.visibility, availabilityCalendar: false },
});

export const buildSiteBookingHref = ({ property, quoteContext, model, pageBasePath, pageSearch }) => {
  if (!property) {
    return null;
  }
  return resolveQuotePanelSiteId({ quoteContext, model })
    ? buildSitePropertyHref(pageBasePath, property.slug, SITE_PROPERTY_PAGE_KINDS.request, pageSearch)
    : "";
};

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

const buildSitePropertyPage = ({
  pageKind,
  model,
  property,
  propertyRules,
  quoteSiteId,
  pageBasePath,
  pageSearch,
  search,
}) => {
  const stay = readSitePropertyStayQuery(search);
  const staySearch = buildSitePropertyStayQuery(pageSearch, stay);
  const overviewHref = buildSiteHref(pageBasePath, [], pageSearch);
  const hasContactPage = normalizeSitePages(model.sitePages)[CONTACT_PAGE_KEY].enabled;

  return {
    kind: pageKind,
    pageKey: ACCOMMODATION_PAGE_KEY,
    title: model.hero.title,
    overviewHref,
    propertyHref: buildSitePropertyHref(pageBasePath, property.slug, SITE_PROPERTY_PAGE_KINDS.property, staySearch),
    sentHref: buildSitePropertyHref(pageBasePath, property.slug, SITE_PROPERTY_PAGE_KINDS.sent, pageSearch),
    contactHref: hasContactPage ? buildSitePageHref(pageBasePath, CONTACT_PAGE_KEY, pageSearch) : "",
    navItems: buildSitePropertyNavItems({ sitePages: model.sitePages, overviewHref, pageBasePath, pageSearch }),
    stay,
    rules: Array.isArray(propertyRules) ? propertyRules : [],
    booking: quoteSiteId
      ? {
          key: `${property.propertyId}${staySearch}`,
          siteId: quoteSiteId,
          propertyId: property.isMainProperty ? "" : property.propertyId,
        }
      : null,
    ...(LIGHT_HEADER_PAGE_KINDS.has(pageKind) ? { headerTone: "light" } : {}),
    buildRequestHref: (requestStay) =>
      buildSitePropertyHref(
        pageBasePath,
        property.slug,
        SITE_PROPERTY_PAGE_KINDS.request,
        buildSitePropertyStayQuery(pageSearch, requestStay)
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
  const bookingHref = buildSiteBookingHref({ property, quoteContext, model, pageBasePath, pageSearch });

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
      bookingHref={bookingHref}
    />
  );
}

function SitePropertyElitePage({
  pageKind,
  templateId,
  model,
  property,
  propertyRules = [],
  quoteContext,
  pageBasePath,
  pageSearch,
}) {
  const { search } = useLocation();
  const quoteSiteId = resolveQuotePanelSiteId({ quoteContext, model });
  const sitePropertyPage = useMemo(
    () =>
      buildSitePropertyPage({
        pageKind,
        model,
        property,
        propertyRules,
        quoteSiteId,
        pageBasePath,
        pageSearch,
        search,
      }),
    [model, pageBasePath, pageKind, pageSearch, property, propertyRules, quoteSiteId, search]
  );

  return (
    <WebsiteTemplateSurface
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
  propertyRules: PropTypes.arrayOf(PropTypes.object),
};

SitePropertyAccommodationPage.propTypes = sitePropertyPagePropTypes;
SitePropertyElitePage.propTypes = sitePropertyPagePropTypes;
SitePropertyPage.propTypes = sitePropertyPagePropTypes;

export const SITE_PROPERTY_PAGES = Object.freeze({
  [SITE_PROPERTY_PAGE_KINDS.property]: SitePropertyPage,
  [SITE_PROPERTY_PAGE_KINDS.photos]: SitePropertyAccommodationPage,
  [SITE_PROPERTY_PAGE_KINDS.request]: SitePropertyPage,
  [SITE_PROPERTY_PAGE_KINDS.sent]: SitePropertyPage,
});
