const DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";
const WEBSITE_DOMAIN_SLUG_MAX_LENGTH = 40;
const WEBSITE_DOMAIN_ID_SUFFIX_LENGTH = 8;
const WEBSITE_DOMAIN_LABEL_MAX_LENGTH = 63;
const WEBSITE_DOMAIN_LABEL_SEPARATOR_PATTERN = /[^a-z0-9]+/g;
const WEBSITE_NON_ASCII_PATTERN = /[^\x00-\x7f]/g;
const WEBSITE_ID_SUFFIX_SANITIZER_PATTERN = /[^a-z0-9]/g;

const cleanWebsiteText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();

const getDirectBookingWebsiteFallbackDomainSuffix = () =>
  cleanWebsiteText(process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX).toLowerCase() ||
  DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX;

const trimWebsiteDomainLabelEdges = (value) => {
  const normalizedValue = String(value || "");
  let startIndex = 0;
  let endIndex = normalizedValue.length;

  while (startIndex < endIndex && normalizedValue[startIndex] === "-") {
    startIndex += 1;
  }

  while (endIndex > startIndex && normalizedValue[endIndex - 1] === "-") {
    endIndex -= 1;
  }

  return normalizedValue.slice(startIndex, endIndex);
};

const normalizeAsciiWebsiteText = (value) =>
  cleanWebsiteText(value).normalize("NFKD").toLowerCase().replace(WEBSITE_NON_ASCII_PATTERN, "");

const slugifyWebsiteDomainLabel = (value) =>
  trimWebsiteDomainLabelEdges(
    normalizeAsciiWebsiteText(value).replace(WEBSITE_DOMAIN_LABEL_SEPARATOR_PATTERN, "-")
  ) || "site";

const normalizePublishedWebsiteIdSuffix = (value) =>
  cleanWebsiteText(value).toLowerCase().replace(WEBSITE_ID_SUFFIX_SANITIZER_PATTERN, "");

const buildPublishedWebsiteDomainLabel = (siteName, siteId) => {
  const slugBase =
    trimWebsiteDomainLabelEdges(slugifyWebsiteDomainLabel(siteName).slice(0, WEBSITE_DOMAIN_SLUG_MAX_LENGTH)) ||
    "site";
  const idSuffix = normalizePublishedWebsiteIdSuffix(siteId).slice(0, WEBSITE_DOMAIN_ID_SUFFIX_LENGTH) || "domits";
  return trimWebsiteDomainLabelEdges(`${slugBase}-${idSuffix}`.slice(0, WEBSITE_DOMAIN_LABEL_MAX_LENGTH));
};

export const resolvePublishedWebsiteDomain = (domain = "", siteName = "", siteId = "") => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (normalizedDomain) {
    return normalizedDomain;
  }

  const normalizedSiteId = String(siteId || "").trim();
  if (!normalizedSiteId) {
    return "";
  }

  return `${buildPublishedWebsiteDomainLabel(siteName, normalizedSiteId)}.${getDirectBookingWebsiteFallbackDomainSuffix()}`;
};

export const buildPublishedWebsitePath = (domain = "", siteId = "", siteName = "") => {
  const normalizedDomain = resolvePublishedWebsiteDomain(domain, siteName, siteId);
  const normalizedSiteId = String(siteId || "").trim();
  if (!normalizedDomain) {
    return normalizedSiteId ? `/website-live?siteId=${encodeURIComponent(normalizedSiteId)}` : "";
  }

  const path = `/website-live/${encodeURIComponent(normalizedDomain)}`;
  return normalizedSiteId ? `${path}?siteId=${encodeURIComponent(normalizedSiteId)}` : path;
};

export const buildWebsitePreviewPath = (draftId) =>
  `/website-preview/${encodeURIComponent(String(draftId || "").trim())}`;

export const buildPublishedWebsiteHref = (domain, siteId = "", domainStatus = "", siteName = "") => {
  const normalizedDomain = resolvePublishedWebsiteDomain(domain, siteName, siteId);

  if (normalizedDomain && String(domainStatus || "").trim().toUpperCase() === "ACTIVE") {
    return `https://${normalizedDomain}`;
  }

  return buildPublishedWebsitePath(normalizedDomain, siteId, siteName);
};
