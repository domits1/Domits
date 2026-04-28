import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildWebsitePreviewUrl = (draftId) =>
  `${PROPERTY_API_BASE}/website/preview?draft=${encodeURIComponent(draftId)}`;

export const fetchWebsitePreviewByDraftId = async (draftId) => {
  const normalizedDraftId = String(draftId || "").trim();
  if (!normalizedDraftId) {
    throw new Error("Missing website preview id.");
  }

  const response = await fetch(buildWebsitePreviewUrl(normalizedDraftId), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load this website preview."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};
