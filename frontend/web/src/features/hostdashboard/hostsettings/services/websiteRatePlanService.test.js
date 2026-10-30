import { Auth } from "aws-amplify";
import { getAccessToken } from "../../../../services/getAccessToken";
import {
  WEBSITE_CONNECTION_FAILED_MESSAGE,
  WEBSITE_SESSION_EXPIRED_MESSAGE,
  WebsiteConnectionError,
  WebsiteSessionExpiredError,
} from "../../website/services/websiteSession";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "./websiteRatePlanService";

jest.mock("aws-amplify", () => ({
  Auth: { currentSession: jest.fn(), userPool: { getCurrentUser: jest.fn() } },
}));
jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const RATE_PLAN_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/website/rate-plan";

const sessionWith = (accessToken) => ({
  getAccessToken: () => ({ getJwtToken: () => accessToken }),
});
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});
const userRefreshingTo = (accessToken) => ({
  getSession: (callback) =>
    callback(null, {
      ...sessionWith("expiring-token"),
      getRefreshToken: () => "refresh-token",
    }),
  refreshSession: jest.fn((_refreshToken, callback) =>
    callback(null, sessionWith(accessToken))
  ),
});

describe("websiteRatePlanService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentSession.mockReset();
    Auth.currentSession.mockResolvedValue(sessionWith("fresh-token"));
    Auth.userPool.getCurrentUser.mockReset();
    getAccessToken.mockReturnValue("stale-local-token");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("loads the current website rate plan with the token of the current session", async () => {
    const plan = { plan: "essentials", priceCents: 0, status: "ACTIVE" };
    global.fetch.mockResolvedValue(jsonResponse(200, plan));

    await expect(getWebsiteRatePlan()).resolves.toEqual(plan);
    expect(global.fetch).toHaveBeenCalledWith(RATE_PLAN_URL, {
      method: "GET",
      headers: {
        Authorization: "fresh-token",
        "Content-Type": "application/json",
      },
    });
  });

  test("requests an Elite checkout through PATCH", async () => {
    const result = {
      action: "checkout_required",
      checkoutUrl: "https://checkout.stripe.com/session",
    };
    global.fetch.mockResolvedValue(jsonResponse(200, result));

    await expect(changeWebsiteRatePlan("elite")).resolves.toEqual(result);
    expect(global.fetch).toHaveBeenCalledWith(RATE_PLAN_URL, {
      method: "PATCH",
      headers: {
        Authorization: "fresh-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: "elite" }),
    });
  });

  test("surfaces failures from the rate-plan PATCH request", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(503, { message: "Checkout is not configured." })
    );

    await expect(changeWebsiteRatePlan("elite")).rejects.toThrow(
      "Checkout is not configured."
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("rejects unsupported plans before reading the session or making a request", async () => {
    await expect(changeWebsiteRatePlan("enterprise")).rejects.toThrow(
      "Unsupported website rate plan."
    );
    expect(Auth.currentSession).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([
    ["getWebsiteRatePlan", () => getWebsiteRatePlan()],
    ["changeWebsiteRatePlan", () => changeWebsiteRatePlan("essentials")],
  ])(
    "%s shows the session expired message without a request when the session cannot be refreshed",
    async (_name, call) => {
      Auth.currentSession.mockRejectedValue(
        Object.assign(new Error("Refresh Token has expired"), {
          code: "NotAuthorizedException",
        })
      );

      const error = await call().catch((caught) => caught);

      expect(error).toBeInstanceOf(WebsiteSessionExpiredError);
      expect(error.message).toBe(WEBSITE_SESSION_EXPIRED_MESSAGE);
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  test("shows the connection message without a request when the login check cannot reach Cognito", async () => {
    Auth.currentSession.mockRejectedValue(
      Object.assign(new Error("Network error"), { code: "NetworkError" })
    );

    const error = await changeWebsiteRatePlan("elite").catch((caught) => caught);

    expect(error).toBeInstanceOf(WebsiteConnectionError);
    expect(error.message).toBe(WEBSITE_CONNECTION_FAILED_MESSAGE);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("changes the plan once after one retry when the token expired on the way", async () => {
    const result = { action: "downgraded", plan: { plan: "essentials" } };
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(
      userRefreshingTo("refreshed-token")
    );
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, "You must be logged in."))
      .mockResolvedValueOnce(jsonResponse(200, result));

    await expect(changeWebsiteRatePlan("essentials")).resolves.toEqual(result);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe(
      "refreshed-token"
    );
    expect(global.fetch.mock.calls[1][1].body).toBe(
      global.fetch.mock.calls[0][1].body
    );
  });

  test("shows the session expired message when the backend still answers 401 after the refresh", async () => {
    Auth.currentSession.mockResolvedValue(sessionWith("expiring-token"));
    Auth.userPool.getCurrentUser.mockReturnValue(
      userRefreshingTo("refreshed-token")
    );
    global.fetch.mockResolvedValue(jsonResponse(401, "You must be logged in."));

    await expect(changeWebsiteRatePlan("essentials")).rejects.toThrow(
      WEBSITE_SESSION_EXPIRED_MESSAGE
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("surfaces a 403 from the API without a retry", async () => {
    global.fetch.mockResolvedValue(jsonResponse(403, "You must be a Host."));

    await expect(getWebsiteRatePlan()).rejects.toThrow("You must be a Host.");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
