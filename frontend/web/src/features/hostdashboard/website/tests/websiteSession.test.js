import { Auth } from "aws-amplify";
import {
  WEBSITE_CONNECTION_FAILED_MESSAGE,
  WEBSITE_SESSION_EXPIRED_MESSAGE,
  WebsiteConnectionError,
  WebsiteSessionExpiredError,
  fetchWithWebsiteSession,
} from "../services/websiteSession";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } } }));

const URL = "https://api.example.test/property/website/draft";
const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });
const response = (status) => ({ ok: status >= 200 && status < 300, status });
const userRefreshingTo = (accessToken, failure = null) => ({
  getSession: (callback) => callback(null, { getRefreshToken: () => "refresh-token" }),
  refreshSession: jest.fn((_refreshToken, callback) => callback(failure, failure ? null : sessionWith(accessToken))),
});

describe("fetchWithWebsiteSession", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    Auth.currentSession.mockReset();
  });

  it("sends the access token of the current session and keeps the request as it was", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(response(200));

    await fetchWithWebsiteSession(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"propertyId":"p1"}',
    });

    expect(global.fetch).toHaveBeenCalledWith(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "fresh-token" },
      body: '{"propertyId":"p1"}',
    });
  });

  it("reads the session once for requests that start together, and again for a later request", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(response(200));

    await Promise.all([fetchWithWebsiteSession(URL), fetchWithWebsiteSession(URL)]);
    expect(Auth.currentSession).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await fetchWithWebsiteSession(URL);
    expect(Auth.currentSession).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "the refresh token has expired",
      Object.assign(new Error("Refresh Token has expired"), { code: "NotAuthorizedException" }),
    ],
    ["nobody is signed in", "No current user"],
  ])("throws the session expired error without a request when %s", async (_label, failure) => {
    Auth.currentSession.mockRejectedValue(failure);

    const error = await fetchWithWebsiteSession(URL).catch((caught) => caught);

    expect(error).toBeInstanceOf(WebsiteSessionExpiredError);
    expect(error.message).toBe(WEBSITE_SESSION_EXPIRED_MESSAGE);
    expect(error.cause).toBe(failure);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws the session expired error when the session has no access token", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith(""));

    await expect(fetchWithWebsiteSession(URL)).rejects.toBeInstanceOf(WebsiteSessionExpiredError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("reports a network failure during the refresh as a connection problem, not as an expired session", async () => {
    const failure = Object.assign(new Error("Network error"), { code: "NetworkError" });
    Auth.currentSession.mockRejectedValue(failure);

    const error = await fetchWithWebsiteSession(URL).catch((caught) => caught);

    expect(error).toBeInstanceOf(WebsiteConnectionError);
    expect(error.message).toBe(WEBSITE_CONNECTION_FAILED_MESSAGE);
    expect(error.cause).toBe(failure);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("asks Cognito for a new token when the session still gives the token the backend rejected", async () => {
    const user = userRefreshingTo("refreshed-token");
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(user);
    global.fetch.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));

    const result = await fetchWithWebsiteSession(URL, { method: "POST", body: '{"propertyId":"p1"}' });

    expect(result.status).toBe(200);
    expect(user.refreshSession).toHaveBeenCalledWith("refresh-token", expect.any(Function));
    expect(global.fetch.mock.calls[1]).toEqual([
      URL,
      { method: "POST", body: '{"propertyId":"p1"}', headers: { Authorization: "refreshed-token" } },
    ]);
  });

  it("shares one forced refresh between requests that are rejected together", async () => {
    const user = userRefreshingTo("refreshed-token");
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(user);
    global.fetch.mockImplementation(async (_url, init) =>
      response(init.headers.Authorization === "refreshed-token" ? 200 : 401)
    );

    await Promise.all([fetchWithWebsiteSession(URL), fetchWithWebsiteSession(URL)]);

    expect(user.refreshSession).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it.each([
    [
      "Cognito refuses the refresh",
      () =>
        userRefreshingTo("", Object.assign(new Error("Refresh Token has expired"), { code: "NotAuthorizedException" })),
      WebsiteSessionExpiredError,
    ],
    ["nobody is signed in any more", () => null, WebsiteSessionExpiredError],
    [
      "the stored session cannot be loaded",
      () => ({
        getSession: (callback) => Promise.resolve().then(() => callback(new Error("Refresh Token has expired"))),
      }),
      WebsiteSessionExpiredError,
    ],
    ["the refresh gives back the rejected token", () => userRefreshingTo("expiring-token"), WebsiteSessionExpiredError],
    [
      "the network fails during the refresh",
      () => userRefreshingTo("", Object.assign(new Error("Network error"), { code: "NetworkError" })),
      WebsiteConnectionError,
    ],
  ])("does not retry after a 401 when %s", async (_label, currentUser, expectedError) => {
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(currentUser());
    global.fetch.mockResolvedValue(response(401));

    await expect(fetchWithWebsiteSession(URL)).rejects.toBeInstanceOf(expectedError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws the session expired error when the retry is rejected as well", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("first-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(userRefreshingTo("second-token"));
    global.fetch.mockResolvedValue(response(401));

    await expect(fetchWithWebsiteSession(URL)).rejects.toBeInstanceOf(WebsiteSessionExpiredError);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([403, 500])("hands a %s response back without a retry", async (status) => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(response(status));

    const result = await fetchWithWebsiteSession(URL);

    expect(result.status).toBe(status);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(Auth.currentSession).toHaveBeenCalledTimes(1);
    expect(Auth.userPool.getCurrentUser).not.toHaveBeenCalled();
  });
});
