import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

const buildSinglePropertyUrl = (propertyId) =>
  `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`;

const resolveApiErrorMessage = async (response, fallbackMessage) => {
  try {
    const rawBody = await response.text();
    if (!rawBody) {
      return fallbackMessage;
    }

    try {
      const parsedBody = JSON.parse(rawBody);
      if (typeof parsedBody === "string" && parsedBody.trim()) {
        return parsedBody.trim();
      }
      if (typeof parsedBody?.message === "string" && parsedBody.message.trim()) {
        return parsedBody.message.trim();
      }
    } catch {
      if (rawBody.trim()) {
        return rawBody.trim();
      }
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

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
    const errorMessage = await resolveApiErrorMessage(
      response,
      "We could not load the selected listing for website preview."
    );
    throw new Error(errorMessage);
  }

  return response.json();
};
