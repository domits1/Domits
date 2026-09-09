export const DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";

const WEBSITE_PREVIEW_PATH_PREFIX = "/website-preview";
const WEBSITE_LIVE_PATH_PREFIX = "/website-live";

export const normalizeDirectBookingWebsiteHostName = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.split(":")[0] || "";
};

export const getDirectBookingWebsiteFallbackDomainSuffix = () =>
  normalizeDirectBookingWebsiteHostName(
    process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX ||
      DEFAULT_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX
  );

export const isDirectBookingWebsiteSurfaceForced = () =>
  String(process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE || "")
    .trim()
    .toLowerCase() === "true";

export const isDirectBookingWebsiteHostName = (hostName) => {
  const normalizedHostName = normalizeDirectBookingWebsiteHostName(hostName);
  const fallbackDomainSuffix = getDirectBookingWebsiteFallbackDomainSuffix();

  if (!normalizedHostName || !fallbackDomainSuffix) {
    return false;
  }

  return normalizedHostName === fallbackDomainSuffix || normalizedHostName.endsWith(`.${fallbackDomainSuffix}`);
};

export const resolveDirectBookingWebsiteSurface = ({ hostname = "", pathname = "" } = {}) => {
  const normalizedPathname = String(pathname || "");
  const isPreviewPath = normalizedPathname.startsWith(WEBSITE_PREVIEW_PATH_PREFIX);
  const isLivePath = normalizedPathname.startsWith(WEBSITE_LIVE_PATH_PREFIX);
  const isHost = isDirectBookingWebsiteSurfaceForced() || isDirectBookingWebsiteHostName(hostname);

  return {
    isHost,
    isPreviewPath,
    isLivePath,
    isSurface: isHost || isPreviewPath || isLivePath,
  };
};
