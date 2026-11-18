import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";
import { WebsiteSessionExpiredError, fetchWithWebsiteSession } from "./websiteSession";

export const WEBSITE_PREVIEW_LOGIN_MESSAGE = "Log in as the host of this website to see its preview.";

const buildWebsitePreviewUrl = (draftId) =>
  `${PROPERTY_API_BASE}/website/preview?draft=${encodeURIComponent(draftId)}`;

const requestWebsitePreview = async (draftId) => {
  try {
    return await fetchWithWebsiteSession(buildWebsitePreviewUrl(draftId), {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    throw error instanceof WebsiteSessionExpiredError ? new Error(WEBSITE_PREVIEW_LOGIN_MESSAGE) : error;
  }
};

export const fetchWebsitePreviewByDraftId = async (draftId) => {
  const normalizedDraftId = String(draftId || "").trim();
  if (!normalizedDraftId) {
    throw new Error("Missing website preview id.");
  }

  const response = await requestWebsitePreview(normalizedDraftId);

  if (response.status === 403) {
    throw new Error(WEBSITE_PREVIEW_LOGIN_MESSAGE);
  }
  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load this website preview."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};
