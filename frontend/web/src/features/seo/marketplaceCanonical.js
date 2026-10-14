import { resolveDirectBookingWebsiteSurface } from "../hostdashboard/website/directBookingWebsiteSurface";

export const MARKETPLACE_CANONICAL_ORIGIN = "https://www.domits.com";

const MARKETPLACE_HOST_NAMES = Object.freeze([
  "domits.com",
  "www.domits.com",
  "acceptance.domits.com",
  "main.d34jwd0sihmsus.amplifyapp.com",
  "acceptance.d34jwd0sihmsus.amplifyapp.com",
]);

const INDEXABLE_PATHS = Object.freeze([
  "/",
  "/home",
  "/about",
  "/team",
  "/data-safety",
  "/helpdesk-guest",
  "/helpdesk-host",
  "/how-it-works",
  "/why-domits",
  "/contact",
  "/travelinnovation",
  "/release",
  "/career",
  "/policy",
  "/terms",
  "/disclaimers",
  "/Sustainability",
  "/performance",
  "/security",
]);

const JOB_PATH_PATTERN = /^\/job\/([^/]+)$/;
const LISTING_PATH = "/listingdetails";

const normalizeHostName = (hostname) => String(hostname || "").trim().toLowerCase().split(":")[0];

const stripTrailingSlash = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

export const isMarketplaceCanonicalHost = (hostname) => {
  const normalizedHostName = normalizeHostName(hostname);
  if (!normalizedHostName) {
    return false;
  }

  return MARKETPLACE_HOST_NAMES.includes(normalizedHostName);
};

export const resolveMarketplaceCanonicalPath = (pathname, search = "") => {
  const normalizedPath = stripTrailingSlash(String(pathname || ""));
  if (!normalizedPath.startsWith("/")) {
    return "";
  }

  if (INDEXABLE_PATHS.includes(normalizedPath)) {
    return normalizedPath;
  }

  const jobMatch = JOB_PATH_PATTERN.exec(normalizedPath);
  if (jobMatch) {
    return normalizedPath;
  }

  if (normalizedPath === LISTING_PATH) {
    const listingId = new URLSearchParams(String(search || "")).get("ID");
    return listingId ? `${LISTING_PATH}?ID=${encodeURIComponent(listingId)}` : "";
  }

  return "";
};

export const resolveMarketplaceCanonicalUrl = ({ hostname = "", pathname = "", search = "" } = {}) => {
  if (!isMarketplaceCanonicalHost(hostname)) {
    return "";
  }

  if (resolveDirectBookingWebsiteSurface({ hostname, pathname }).isSurface) {
    return "";
  }

  const canonicalPath = resolveMarketplaceCanonicalPath(pathname, search);
  return canonicalPath ? `${MARKETPLACE_CANONICAL_ORIGIN}${canonicalPath}` : "";
};
