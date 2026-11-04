import { PROPERTY_API_BASE } from "../../../services/propertyApiConfig";
import { getAccessToken } from "../../../services/getAccessToken";
import { PROPERTY_REVIEW_ACCESS, PROPERTY_REVIEW_ADMIN_ROUTE, checkPropertyReviewAccess } from "./propertyReviewAccess";

jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const respondWith = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

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
    global.fetch.mockResolvedValue(respondWith(200, { allowed: true }));

    await checkPropertyReviewAccess();

    expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/review/access`, {
      method: "GET",
      headers: { Authorization: "raw-access-token" },
    });
  });

  test("returns allowed when the backend allows the user", async () => {
    global.fetch.mockResolvedValue(respondWith(200, { allowed: true }));

    expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.ALLOWED);
  });

  test.each([[{ allowed: false }], [{ allowed: "true" }], [{}]])(
    "returns denied for a 200 answer of %j",
    async (body) => {
      global.fetch.mockResolvedValue(respondWith(200, body));

      expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.DENIED);
    }
  );

  test.each([401, 403, 429, 500, 503])(
    "returns unavailable for status %s, even if the body says allowed",
    async (status) => {
      global.fetch.mockResolvedValue(respondWith(status, { allowed: true }));

      expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.UNAVAILABLE);
    }
  );

  test("returns unavailable when a 200 answer is not JSON", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });

    expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.UNAVAILABLE);
  });

  test("returns unavailable when the request fails", async () => {
    global.fetch.mockRejectedValue(new Error("network down"));

    expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.UNAVAILABLE);
  });

  test("returns denied without calling the backend when there is no token", async () => {
    getAccessToken.mockReturnValue(null);

    expect(await checkPropertyReviewAccess()).toBe(PROPERTY_REVIEW_ACCESS.DENIED);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
