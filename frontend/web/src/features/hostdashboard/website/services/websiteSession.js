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

const toSessionError = (error) =>
  isNetworkFailure(error) ? new WebsiteConnectionError(error) : new WebsiteSessionExpiredError(error);

const readAccessToken = async (loadSession) => {
  let session;
  try {
    session = await loadSession();
  } catch (error) {
    throw toSessionError(error);
  }

  const accessToken = session?.getAccessToken?.()?.getJwtToken?.();
  if (!accessToken) {
    throw new WebsiteSessionExpiredError();
  }
  return accessToken;
};

const forceSessionRefresh = () =>
  new Promise((resolve, reject) => {
    const user = Auth.userPool?.getCurrentUser?.();
    if (!user) {
      reject(new Error("No current user"));
      return;
    }
    user.getSession((sessionError, session) => {
      if (sessionError) {
        reject(sessionError);
        return;
      }
      user.refreshSession(session.getRefreshToken(), (refreshError, refreshedSession) =>
        refreshError ? reject(refreshError) : resolve(refreshedSession)
      );
    });
  });

const shareInFlight = (read) => {
  let pending = null;
  return () => {
    if (!pending) {
      pending = read().finally(() => {
        pending = null;
      });
    }
    return pending;
  };
};

export const getWebsiteAccessToken = shareInFlight(() => readAccessToken(() => Auth.currentSession()));
const refreshWebsiteAccessToken = shareInFlight(() => readAccessToken(forceSessionRefresh));

const sendWithAccessToken = (url, init, accessToken) =>
  fetch(url, { ...init, headers: { ...init.headers, Authorization: accessToken } });

export const fetchWithWebsiteSession = async (url, init = {}) => {
  const accessToken = await getWebsiteAccessToken();
  const response = await sendWithAccessToken(url, init, accessToken);
  if (response.status !== 401) {
    return response;
  }

  const retryAccessToken = await refreshWebsiteAccessToken();
  if (retryAccessToken === accessToken) {
    throw new WebsiteSessionExpiredError();
  }

  const retryResponse = await sendWithAccessToken(url, init, retryAccessToken);
  if (retryResponse.status === 401) {
    throw new WebsiteSessionExpiredError();
  }
  return retryResponse;
};
