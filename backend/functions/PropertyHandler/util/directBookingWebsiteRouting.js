const DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";

const cleanWebsiteText = (value) => String(value || "").replaceAll(/\s+/g, " ").trim();

const getConfiguredEnvValue = (...envNames) => {
  for (const envName of envNames) {
    const configuredValue = cleanWebsiteText(process.env[envName]);
    if (configuredValue) {
      return configuredValue;
    }
  }

  return "";
};

const normalizeDomainStatus = (status) => String(status || "").trim().toUpperCase();
const normalizeDomainType = (domainType) => String(domainType || "").trim().toUpperCase();

export const getDirectBookingWebsiteFallbackDomainSuffix = () => {
  const configuredSuffix = getConfiguredEnvValue(
    "DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX"
  ).toLowerCase();

  return configuredSuffix || DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX;
};

export const isDirectBookingWebsiteFallbackRoutingActive = () =>
  String(process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE ?? "").trim().toLowerCase() ===
  "true";

export const getDirectBookingWebsiteFallbackRoutingStatus = () =>
  isDirectBookingWebsiteFallbackRoutingActive() ? "ACTIVE" : "PENDING";

export const isDirectBookingWebsiteFallbackDomain = (domainEntry = {}) => {
  const normalizedDomainType = normalizeDomainType(
    domainEntry?.domainType ?? domainEntry?.domain_type
  );
  if (normalizedDomainType) {
    return normalizedDomainType === "FALLBACK";
  }

  const normalizedDomain = cleanWebsiteText(domainEntry?.domain).toLowerCase();
  const suffix = getDirectBookingWebsiteFallbackDomainSuffix();
  return Boolean(normalizedDomain) && normalizedDomain.endsWith(`.${suffix}`);
};

export const resolveDirectBookingWebsiteFallbackDomainStatus = (domainEntry = {}) => {
  const currentStatus = normalizeDomainStatus(domainEntry?.status);
  if (!isDirectBookingWebsiteFallbackDomain(domainEntry)) {
    return currentStatus;
  }

  if (!isDirectBookingWebsiteFallbackRoutingActive()) {
    return currentStatus;
  }

  if (currentStatus === "DISABLED" || currentStatus === "FAILED") {
    return currentStatus;
  }

  return "ACTIVE";
};

export const isDirectBookingWebsitePublishedFallbackReachable = ({
  siteStatus = "",
  domainEntry = {},
} = {}) =>
  String(siteStatus || "").trim().toUpperCase() === "PUBLISHED" &&
  Boolean(cleanWebsiteText(domainEntry?.domain)) &&
  resolveDirectBookingWebsiteFallbackDomainStatus(domainEntry) === "ACTIVE";
