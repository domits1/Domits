import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { getApiErrorMessage } from "../../hostproperty/utils/hostPropertyUtils";

const getRequiredAccessToken = (fallbackMessage) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error(fallbackMessage);
  }

  return accessToken;
};

export const buildWebsiteHostApiUrl = (path) => `${PROPERTY_API_BASE}${path}`;

export const buildAuthorizedWebsiteHostHeaders = ({
  contentType = null,
  unauthorizedMessage = "You must be signed in to manage this website.",
} = {}) => {
  const headers = {
    Authorization: getRequiredAccessToken(unauthorizedMessage),
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
};

export const getWebsiteHostApiErrorMessage = (response, fallbackMessage) =>
  getApiErrorMessage(response, fallbackMessage);
