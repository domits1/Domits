import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getAuthorizedHeaders, resolveApiErrorMessage } from "./websiteApiServiceShared";

const buildSinglePropertyUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`;

export const fetchWebsitePropertyDetails = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Select a listing before building a website preview.");
  }

  const response = await fetch(buildSinglePropertyUrl(normalizedPropertyId), {
    method: "GET",
    headers: getAuthorizedHeaders("You must be signed in to build a website preview."),
  });

  if (!response.ok) {
    const errorMessage = await resolveApiErrorMessage(
      response,
      "We could not load the selected listing for website preview."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};
