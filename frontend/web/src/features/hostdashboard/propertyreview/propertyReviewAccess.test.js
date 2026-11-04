import { PROPERTY_API_BASE } from "../../../services/propertyApiConfig";
import { getAccessToken } from "../../../services/getAccessToken";
import { PROPERTY_REVIEW_ADMIN_ROUTE, checkPropertyReviewAccess } from "./propertyReviewAccess";

jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const respondWith = (body, ok = true) => ({ ok, json: async () => body });

describe("checkPropertyReviewAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("raw-access-token");
    global.fetch = jest.fn();
  });

  test("exposes the admin route", () => {
    expect(PROPERTY_REVIEW_ADMIN_ROUTE).toBe("admin/property-review");
  });

  test("calls the review access endpoint with the raw access token", async () => {
    global.fetch.mockResolvedValue(respondWith({ allowed: true }));

    await checkPropertyReviewAccess();

    expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/review/access`, {
      method: "GET",
      headers: { Authorization: "raw-access-token" },
    });
  });

  test("returns true when the backend allows the user", async () => {
    global.fetch.mockResolvedValue(respondWith({ allowed: true }));

    expect(await checkPropertyReviewAccess()).toBe(true);
  });

  test("returns false when the backend denies the user", async () => {
    global.fetch.mockResolvedValue(respondWith({ allowed: false }));

    expect(await checkPropertyReviewAccess()).toBe(false);
  });

  test("returns false for a truthy value that is not exactly true", async () => {
    global.fetch.mockResolvedValue(respondWith({ allowed: "true" }));

    expect(await checkPropertyReviewAccess()).toBe(false);
  });

  test("returns false when the response is not ok, even if the body says allowed", async () => {
    global.fetch.mockResolvedValue(respondWith({ allowed: true }, false));

    expect(await checkPropertyReviewAccess()).toBe(false);
  });

  test("returns false when the request fails", async () => {
    global.fetch.mockRejectedValue(new Error("network down"));

    expect(await checkPropertyReviewAccess()).toBe(false);
  });

  test("returns false without calling the backend when there is no token", async () => {
    getAccessToken.mockReturnValue(null);

    expect(await checkPropertyReviewAccess()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
