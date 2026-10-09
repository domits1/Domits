import { getAccessToken } from "../../../../services/getAccessToken";
import {
  changeWebsiteRatePlan,
  getWebsiteRatePlan,
} from "./websiteRatePlanService";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

describe("websiteRatePlanService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("loads the current website rate plan with Cognito authentication", async () => {
    const plan = { plan: "essentials", priceCents: 0, status: "ACTIVE" };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(plan),
    });

    await expect(getWebsiteRatePlan()).resolves.toEqual(plan);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/website/rate-plan",
      {
        method: "GET",
        headers: {
          Authorization: "access-token",
          "Content-Type": "application/json",
        },
      }
    );
  });

  test("requests an Elite checkout through PATCH", async () => {
    const result = {
      action: "checkout_required",
      checkoutUrl: "https://checkout.stripe.com/session",
    };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(result),
    });

    await expect(changeWebsiteRatePlan("elite")).resolves.toEqual(result);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/website/rate-plan",
      {
        method: "PATCH",
        headers: {
          Authorization: "access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "elite" }),
      }
    );
  });

  test("rejects unsupported plans before making a request", async () => {
    await expect(changeWebsiteRatePlan("enterprise")).rejects.toThrow(
      "Unsupported website rate plan."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("requires a signed-in user", async () => {
    getAccessToken.mockReturnValue(null);

    await expect(getWebsiteRatePlan()).rejects.toThrow(
      "You must be signed in to manage your website rate plan."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("surfaces API error responses", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue("You must be a Host."),
    });

    await expect(getWebsiteRatePlan()).rejects.toThrow("You must be a Host.");
  });
});
