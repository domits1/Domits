import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildWebsiteDraftsUrl = () => `${PROPERTY_API_BASE}/website/drafts`;
const buildWebsiteDraftUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/website/draft?property=${encodeURIComponent(propertyId)}`;
const buildWebsiteDraftMutationUrl = () => `${PROPERTY_API_BASE}/website/draft`;

const getRequiredAccessToken = () => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to manage website drafts.");
  }

  return accessToken;
};

export const fetchWebsiteDrafts = async () => {
  const response = await fetch(buildWebsiteDraftsUrl(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: getRequiredAccessToken(),
    },
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load your website drafts."
    );
    throw new Error(errorMessage);
  }

  const parsedBody = await response.json();
  return Array.isArray(parsedBody) ? parsedBody : [];
};

export const fetchWebsiteDraftByPropertyId = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website draft lookup.");
  }

  const response = await fetch(buildWebsiteDraftUrl(normalizedPropertyId), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: getRequiredAccessToken(),
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the website draft for this listing."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};

export const upsertWebsiteDraft = async ({
  propertyId,
  templateKey,
  status = "DRAFT",
  contentOverrides = {},
  themeOverrides = {},
  publishedContentOverrides = undefined,
  publishedThemeOverrides = undefined,
}) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website draft save.");
  }

  const normalizedTemplateKey = String(templateKey || "").trim();
  if (!normalizedTemplateKey) {
    throw new Error("Missing templateKey for website draft save.");
  }

  const response = await fetch(buildWebsiteDraftMutationUrl(), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: getRequiredAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
      templateKey: normalizedTemplateKey,
      status,
      contentOverrides,
      themeOverrides,
      publishedContentOverrides,
      publishedThemeOverrides,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not save this website draft."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};

export const deleteWebsiteDraft = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for website draft delete.");
  }

  const response = await fetch(buildWebsiteDraftMutationUrl(), {
    method: "DELETE",
    cache: "no-store",
    headers: {
      Authorization: getRequiredAccessToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not delete this website draft."
    );
    throw new Error(errorMessage);
  }
};
