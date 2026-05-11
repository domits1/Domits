import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildWebsiteSiteUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/website/site?property=${encodeURIComponent(propertyId)}`;
const buildWebsiteSitePublishUrl = () => `${PROPERTY_API_BASE}/website/site/publish`;
const buildWebsiteSiteUnpublishUrl = () => `${PROPERTY_API_BASE}/website/site/unpublish`;

const getRequiredAccessToken = () => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to manage website publishing.");
  }

  return accessToken;
};

const buildAuthorizedHeaders = (contentType = null) => {
  const headers = {
    Authorization: getRequiredAccessToken(),
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
};

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

export const fetchWebsiteSiteByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website site lookup.");
  }

  const response = await fetch(buildWebsiteSiteUrl(normalizedPropertyId), {
    method: "GET",
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the standalone site status for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};

export const publishWebsiteSite = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website publish.");
  }

  const response = await fetch(buildWebsiteSitePublishUrl(), {
    method: "POST",
    cache: "no-store",
    headers: buildAuthorizedHeaders("application/json"),
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not publish the standalone site for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};

export const unpublishWebsiteSite = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website unpublish.");
  }

  const response = await fetch(buildWebsiteSiteUnpublishUrl(), {
    method: "POST",
    cache: "no-store",
    headers: buildAuthorizedHeaders("application/json"),
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not unpublish the standalone site for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};
