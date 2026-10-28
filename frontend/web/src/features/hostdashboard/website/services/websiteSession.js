import { Auth } from "aws-amplify";

export const WEBSITE_SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";
export const WEBSITE_CONNECTION_FAILED_MESSAGE = "We could not reach Domits. Check your connection and try again.";

export class WebsiteSessionExpiredError extends Error {
  constructor(cause = null) {
    super(WEBSITE_SESSION_EXPIRED_MESSAGE);
    this.name = "WebsiteSessionExpiredError";
    this.cause = cause;
  }
}

export class WebsiteConnectionError extends Error {
  constructor(cause = null) {
    super(WEBSITE_CONNECTION_FAILED_MESSAGE);
    this.name = "WebsiteConnectionError";
    this.cause = cause;
  }
}

const isNetworkFailure = (error) => error?.code === "NetworkError" || error?.name === "NetworkError";

const readSessionAccessToken = async () => {
  let session;
  try {
    session = await Auth.currentSession();
  } catch (error) {
    if (isNetworkFailure(error)) {
      throw new WebsiteConnectionError(error);
    }
    throw new WebsiteSessionExpiredError(error);
  }

  const accessToken = session?.getAccessToken?.()?.getJwtToken?.();
  if (!accessToken) {
    throw new WebsiteSessionExpiredError();
  }
  return accessToken;
};

let pendingAccessToken = null;

export const getWebsiteAccessToken = () => {
  if (!pendingAccessToken) {
    pendingAccessToken = readSessionAccessToken().finally(() => {
      pendingAccessToken = null;
    });
  }
  return pendingAccessToken;
};

const sendWithAccessToken = (url, init, accessToken) =>
  fetch(url, { ...init, headers: { ...init.headers, Authorization: accessToken } });

export const fetchWithWebsiteSession = async (url, init = {}) => {
  const accessToken = await getWebsiteAccessToken();
  const response = await sendWithAccessToken(url, init, accessToken);
  if (response.status !== 401) {
    return response;
  }

  const retryAccessToken = await getWebsiteAccessToken();
  if (retryAccessToken === accessToken) {
    throw new WebsiteSessionExpiredError();
  }

  const retryResponse = await sendWithAccessToken(url, init, retryAccessToken);
  if (retryResponse.status === 401) {
    throw new WebsiteSessionExpiredError();
  }
  return retryResponse;
};
