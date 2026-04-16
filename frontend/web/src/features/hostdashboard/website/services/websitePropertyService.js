import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const buildSinglePropertyUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`;

export const fetchWebsitePropertyDetails = async (propertyId) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Select a listing before building a website preview.");
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("You must be signed in to build a website preview.");
  }

  const response = await fetch(buildSinglePropertyUrl(normalizedPropertyId), {
    method: "GET",
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    const errorMessage = await getApiErrorMessage(
      response,
      "We could not load the selected listing for website preview."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};
