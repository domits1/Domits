import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";
import { WebsiteConnectionError, WebsiteSessionExpiredError, fetchWithWebsiteSession } from "./websiteSession";

const buildWebsiteSiteUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/website/site?property=${encodeURIComponent(propertyId)}`;
const buildWebsiteSitePublishUrl = () => `${PROPERTY_API_BASE}/website/site/publish`;
const buildWebsiteSiteUnpublishUrl = () => `${PROPERTY_API_BASE}/website/site/unpublish`;
const PUBLISH_RECOVERY_DELAYS_MS = Object.freeze([0, 250, 750]);
const PUBLISH_FAILED_MESSAGE = "We could not publish the direct booking website for this listing.";

const normalizeWebsiteSiteSummary = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const site = payload.site && typeof payload.site === "object" ? payload.site : null;
  const primaryDomain =
    payload.primaryDomain && typeof payload.primaryDomain === "object" ? payload.primaryDomain : null;
  const domains = Array.isArray(payload.domains) ? payload.domains : [];

  return {
    site,
    primaryDomain,
    domains,
    isReachable: Boolean(payload.isReachable),
  };
};

const pause = (delayMs) =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const isPublishedSince = (siteSummary, draftSavedAt) => {
  const publishedAt = Number(siteSummary?.site?.publishedAt);
  return siteSummary?.site?.status === "PUBLISHED" && publishedAt >= draftSavedAt;
};

const findSiteSummaryPublishedSince = async (propertyId, draftSavedAt) => {
  const savedAt = Number(draftSavedAt);
  if (!Number.isFinite(savedAt) || savedAt <= 0) {
    return null;
  }

  for (const delayMs of PUBLISH_RECOVERY_DELAYS_MS) {
    if (delayMs > 0) {
      await pause(delayMs);
    }
    const siteSummary = await fetchWebsiteSiteByPropertyId(propertyId).catch(() => null);
    if (isPublishedSince(siteSummary, savedAt)) {
      return siteSummary;
    }
  }

  return null;
};

const recoverPublishedSiteSummaryOrThrow = async (propertyId, draftSavedAt, publishError) => {
  const siteSummary = await findSiteSummaryPublishedSince(propertyId, draftSavedAt);
  if (siteSummary) {
    return siteSummary;
  }
  throw publishError;
};

const isSessionError = (error) =>
  error instanceof WebsiteSessionExpiredError || error instanceof WebsiteConnectionError;

const isPublishOutcomeUnknown = (response) => response.status >= 500;

export const fetchWebsiteSiteByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website site lookup.");
  }

  const response = await fetchWithWebsiteSession(buildWebsiteSiteUrl(normalizedPropertyId), {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the direct booking website status for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};

export const publishWebsiteSite = async (propertyId, { draftSavedAt } = {}) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website publish.");
  }

  let response;
  try {
    response = await fetchWithWebsiteSession(buildWebsiteSitePublishUrl(), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: normalizedPropertyId,
      }),
    });
  } catch (error) {
    if (isSessionError(error)) {
      throw error;
    }
    return recoverPublishedSiteSummaryOrThrow(normalizedPropertyId, draftSavedAt, error);
  }

  if (!response.ok) {
    const publishError = new Error(await getApiErrorMessage(response, PUBLISH_FAILED_MESSAGE));
    if (!isPublishOutcomeUnknown(response)) {
      throw publishError;
    }
    return recoverPublishedSiteSummaryOrThrow(normalizedPropertyId, draftSavedAt, publishError);
  }

  try {
    return normalizeWebsiteSiteSummary(await response.json());
  } catch (error) {
    return recoverPublishedSiteSummaryOrThrow(normalizedPropertyId, draftSavedAt, error);
  }
};

export const unpublishWebsiteSite = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website unpublish.");
  }

  const response = await fetchWithWebsiteSession(buildWebsiteSiteUnpublishUrl(), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not unpublish the direct booking website for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};
