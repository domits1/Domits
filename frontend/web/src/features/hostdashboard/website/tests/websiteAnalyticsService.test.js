import { Auth } from "aws-amplify";
import {
  recordPublicWebsiteAnalyticsEvent,
  recordWebsiteHostAnalyticsEvent,
  recordWebsiteHostAnalyticsEventSafely,
  recordWebsiteHostAnalyticsEventWithRetry,
} from "../analytics/websiteAnalyticsService";
import { WebsiteConnectionError, WebsiteSessionExpiredError } from "../services/websiteSession";
import { getAccessToken } from "../../../../services/getAccessToken";

jest.mock("aws-amplify", () => ({ Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } } }));
jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));

const EVENT_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/website/event";
const HOST_EVENT = {
  propertyId: "p1",
  draftId: "d1",
  eventType: "WEBSITE_BUILD_STARTED",
  payload: { attemptId: "attempt-1" },
};
const NO_DELAYS = [0, 0, 0];

const sessionWith = (accessToken) => ({ getAccessToken: () => ({ getJwtToken: () => accessToken }) });
const response = (status) => ({ ok: status >= 200 && status < 300, status });
const expiredLogin = () => Object.assign(new Error("Refresh Token has expired"), { code: "NotAuthorizedException" });
const unreachableLogin = () => Object.assign(new Error("Network error"), { code: "NetworkError" });
const userRefreshingTo = (accessToken) => ({
  getSession: (callback) =>
    callback(null, { ...sessionWith("expiring-token"), getRefreshToken: () => "refresh-token" }),
  refreshSession: (_refreshToken, callback) => callback(null, sessionWith(accessToken)),
});

describe("website analytics events and the login session", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    Auth.currentSession.mockReset();
    Auth.userPool.getCurrentUser.mockReset();
    getAccessToken.mockReturnValue("stale-local-token");
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("sends a host event with the token of the current session, not the stored one", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(response(204));

    await recordWebsiteHostAnalyticsEvent({ ...HOST_EVENT, keepalive: true });

    expect(global.fetch).toHaveBeenCalledWith(EVENT_URL, {
      method: "POST",
      cache: "no-store",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: "fresh-token" },
      body: JSON.stringify(HOST_EVENT),
    });
  });

  it("sends the same host event once more with the refreshed token after a 401", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(userRefreshingTo("refreshed-token"));
    global.fetch.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(204));

    await expect(recordWebsiteHostAnalyticsEvent(HOST_EVENT)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe("refreshed-token");
    expect(global.fetch.mock.calls[1][1].body).toBe(global.fetch.mock.calls[0][1].body);
  });

  it("sends no host event when the session cannot be refreshed", async () => {
    Auth.currentSession.mockRejectedValue(expiredLogin());

    await expect(recordWebsiteHostAnalyticsEvent(HOST_EVENT)).rejects.toBeInstanceOf(WebsiteSessionExpiredError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["the session cannot be refreshed", expiredLogin],
    ["the login check cannot reach Cognito", unreachableLogin],
  ])("keeps a background host event quiet when %s", async (_label, failure) => {
    Auth.currentSession.mockRejectedValue(failure());

    await expect(recordWebsiteHostAnalyticsEventSafely(HOST_EVENT)).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stops retrying a host event once the session has expired", async () => {
    Auth.currentSession.mockRejectedValue(expiredLogin());

    await expect(recordWebsiteHostAnalyticsEventWithRetry(HOST_EVENT, NO_DELAYS)).rejects.toBeInstanceOf(
      WebsiteSessionExpiredError
    );
    expect(Auth.currentSession).toHaveBeenCalledTimes(1);
  });

  it("stops retrying a host event once the backend keeps rejecting the refreshed login", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(userRefreshingTo("refreshed-token"));
    global.fetch.mockResolvedValue(response(401));

    await expect(recordWebsiteHostAnalyticsEventWithRetry(HOST_EVENT, NO_DELAYS)).rejects.toBeInstanceOf(
      WebsiteSessionExpiredError
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("tries a host event again after a temporary login check failure", async () => {
    Auth.currentSession
      .mockRejectedValueOnce(unreachableLogin())
      .mockRejectedValueOnce(unreachableLogin())
      .mockResolvedValueOnce(sessionWith("fresh-token"));
    global.fetch.mockResolvedValue(response(204));

    await expect(recordWebsiteHostAnalyticsEventWithRetry(HOST_EVENT, NO_DELAYS)).resolves.toBeUndefined();
    expect(Auth.currentSession).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("reports the last temporary failure when every attempt fails", async () => {
    const failures = [unreachableLogin(), unreachableLogin(), unreachableLogin()];
    failures.forEach((failure) => Auth.currentSession.mockRejectedValueOnce(failure));

    const error = await recordWebsiteHostAnalyticsEventWithRetry(HOST_EVENT, NO_DELAYS).catch((caught) => caught);

    expect(error).toBeInstanceOf(WebsiteConnectionError);
    expect(error.cause).toBe(failures[2]);
    expect(Auth.currentSession).toHaveBeenCalledTimes(3);
  });

  it("sends a public event without the session of a host who is signed in in this browser", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("host-token"));
    global.fetch.mockResolvedValue(response(204));

    await recordPublicWebsiteAnalyticsEvent({ draftId: "d1", eventType: "SITE_LCP_RECORDED", payload: {} });

    expect(Auth.currentSession).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json" });
    expect(global.fetch.mock.calls[0][1].keepalive).toBe(true);
  });
});
