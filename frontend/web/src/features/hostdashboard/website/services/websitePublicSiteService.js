import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const MISSING_PUBLISHED_WEBSITE_STATUSES = new Set([404, 410]);
const PUBLIC_WEBSITE_REQUEST_ERROR_NAME = "PublicWebsiteRequestError";

export class PublicWebsiteRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = PUBLIC_WEBSITE_REQUEST_ERROR_NAME;
    this.status = Number(status) || 0;
  }
}

export const isMissingPublishedWebsiteError = (error) =>
  error?.name === PUBLIC_WEBSITE_REQUEST_ERROR_NAME &&
  MISSING_PUBLISHED_WEBSITE_STATUSES.has(Number(error.status));

const buildPublicWebsiteResolveUrl = (domain) =>
  `${PROPERTY_API_BASE}/website/public/resolve?domain=${encodeURIComponent(domain)}`;
const buildPublicWebsiteRenderUrl = ({ siteId, domain }) => {
  const searchParameters = new URLSearchParams();
  if (siteId) {
    searchParameters.set("site", siteId);
  }
  if (domain) {
    searchParameters.set("domain", domain);
  }

  return `${PROPERTY_API_BASE}/website/public/render?${searchParameters.toString()}`;
};

const normalizePublicWebsiteResolution = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    siteId: String(payload.siteId || "").trim(),
    propertyId: String(payload.propertyId || "").trim(),
    hostId: String(payload.hostId || "").trim(),
    templateKey: String(payload.templateKey || "").trim(),
    primaryLocale: String(payload.primaryLocale || "").trim(),
    siteName: String(payload.siteName || "").trim(),
    siteStatus: String(payload.siteStatus || "").trim(),
    publishedAt: Number(payload.publishedAt || 0) || null,
    isReachable: Boolean(payload.isReachable),
    domain: payload.domain && typeof payload.domain === "object" ? payload.domain : null,
  };
};

const normalizePublicWebsiteRenderPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    resolution: normalizePublicWebsiteResolution(payload.resolution),
    site: payload.site && typeof payload.site === "object" ? payload.site : null,
    domain: payload.domain && typeof payload.domain === "object" ? payload.domain : null,
    propertySnapshot: payload.propertySnapshot && typeof payload.propertySnapshot === "object" ? payload.propertySnapshot : null,
    contentOverrides: payload.contentOverrides && typeof payload.contentOverrides === "object" ? payload.contentOverrides : {},
    themeOverrides: payload.themeOverrides && typeof payload.themeOverrides === "object" ? payload.themeOverrides : {},
    renderSource: String(payload.renderSource || "").trim(),
  };
};

export const fetchPublicWebsiteSiteResolution = async (domain) => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error("Missing website domain.");
  }

  const response = await fetch(buildPublicWebsiteResolveUrl(normalizedDomain), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(response, "We could not resolve this published website.");
    throw new PublicWebsiteRequestError(errorMessage, response.status);
  }

  return normalizePublicWebsiteResolution(await response.json());
};

export const fetchPublicWebsiteRenderModel = async ({ siteId = "", domain = "" }) => {
  const normalizedSiteId = String(siteId || "").trim();
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (!normalizedSiteId && !normalizedDomain) {
    throw new Error("Missing website siteId or domain.");
  }

  const response = await fetch(
    buildPublicWebsiteRenderUrl({
      siteId: normalizedSiteId,
      domain: normalizedDomain,
    }),
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(response, "We could not load this published website.");
    throw new PublicWebsiteRequestError(errorMessage, response.status);
  }

  return normalizePublicWebsiteRenderPayload(await response.json());
};
