import { getAccessToken } from "../../../../services/getAccessToken";

export const resolveApiErrorMessage = async (response, fallbackMessage) => {
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

export const getAuthorizedHeaders = (missingTokenMessage) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error(missingTokenMessage);
  }

  return {
    Authorization: accessToken,
  };
};
