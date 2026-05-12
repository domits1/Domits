import {
  buildAuthorizedWebsiteHostHeaders,
  buildWebsiteHostApiUrl,
  getWebsiteHostApiErrorMessage,
} from "./websiteHostApi";
import { normalizeWebsiteSiteSummary } from "./websiteSiteSummary";

const buildWebsiteSiteUrl = (propertyId) =>
  `${buildWebsiteHostApiUrl("/website/site")}?property=${encodeURIComponent(propertyId)}`;
const buildWebsiteSitePublishUrl = () => buildWebsiteHostApiUrl("/website/site/publish");
const buildWebsiteSiteUnpublishUrl = () => buildWebsiteHostApiUrl("/website/site/unpublish");

export const fetchWebsiteSiteByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website site lookup.");
  }

  const response = await fetch(buildWebsiteSiteUrl(normalizedPropertyId), {
    method: "GET",
    cache: "no-store",
    headers: buildAuthorizedWebsiteHostHeaders({
      unauthorizedMessage: "You must be signed in to manage website publishing.",
    }),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorMessage = await getWebsiteHostApiErrorMessage(
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
    headers: buildAuthorizedWebsiteHostHeaders({
      contentType: "application/json",
      unauthorizedMessage: "You must be signed in to manage website publishing.",
    }),
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getWebsiteHostApiErrorMessage(
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
    headers: buildAuthorizedWebsiteHostHeaders({
      contentType: "application/json",
      unauthorizedMessage: "You must be signed in to manage website publishing.",
    }),
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getWebsiteHostApiErrorMessage(
      response,
      "We could not unpublish the standalone site for this listing."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};
