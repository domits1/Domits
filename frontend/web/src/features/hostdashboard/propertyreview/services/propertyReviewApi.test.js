import { PROPERTY_API_BASE } from "../../../../services/propertyApiConfig";
import { getAccessToken } from "../../../../services/getAccessToken";
import {
  PropertyReviewApiError,
  REVIEW_API_ERROR_CODE,
  fetchReviewQueue,
  requestPropertyReview,
} from "./propertyReviewApi";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const respondWith = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

const respondWithHtml = (status) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    throw new SyntaxError("Unexpected token <");
  },
});

const captureError = async (request) => {
  try {
    await request();
  } catch (error) {
    return error;
  }
  throw new Error("expected the request to fail");
};

describe("propertyReviewApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("raw-access-token");
    global.fetch = jest.fn();
  });

  describe("requestPropertyReview", () => {
    test("sends a GET with the raw access token and the abort signal", async () => {
      const { signal } = new AbortController();
      global.fetch.mockResolvedValue(respondWith(200, { ok: true }));

      const body = await requestPropertyReview("/review/access", { signal });

      expect(body).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/review/access`, {
        method: "GET",
        headers: { Authorization: "raw-access-token" },
        signal,
      });
    });

    test.each([
      [400, REVIEW_API_ERROR_CODE.INVALID_CURSOR],
      [401, REVIEW_API_ERROR_CODE.UNAUTHENTICATED],
      [403, REVIEW_API_ERROR_CODE.FORBIDDEN],
      [429, REVIEW_API_ERROR_CODE.UNAVAILABLE],
      [502, REVIEW_API_ERROR_CODE.UNAVAILABLE],
      [503, REVIEW_API_ERROR_CODE.UNAVAILABLE],
      [504, REVIEW_API_ERROR_CODE.UNAVAILABLE],
      [500, REVIEW_API_ERROR_CODE.SERVER],
    ])("maps status %s to code %s and keeps the backend message", async (status, code) => {
      global.fetch.mockResolvedValue(respondWith(status, { message: "backend says no" }));

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toBeInstanceOf(PropertyReviewApiError);
      expect(error).toMatchObject({ status, code, message: "backend says no" });
    });

    test("falls back to a status message when an error body is not JSON", async () => {
      global.fetch.mockResolvedValue(respondWithHtml(503));

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toMatchObject({ status: 503, code: REVIEW_API_ERROR_CODE.UNAVAILABLE });
      expect(error.message).toContain("503");
    });

    test("rejects a successful response whose body is not JSON", async () => {
      global.fetch.mockResolvedValue(respondWithHtml(200));

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toMatchObject({ status: 200, code: REVIEW_API_ERROR_CODE.SERVER });
    });

    test("wraps a network failure without leaking the raw error", async () => {
      global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toMatchObject({ status: 0, code: REVIEW_API_ERROR_CODE.NETWORK });
      expect(error.message).not.toContain("Failed to fetch");
    });

    test("rethrows an abort so callers can ignore it", async () => {
      const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
      global.fetch.mockRejectedValue(abort);

      expect(await captureError(() => requestPropertyReview("/review/queue"))).toBe(abort);
    });

    test("fails as unauthenticated without calling the backend when there is no token", async () => {
      getAccessToken.mockReturnValue(null);

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toMatchObject({ status: 401, code: REVIEW_API_ERROR_CODE.UNAUTHENTICATED });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("fetchReviewQueue", () => {
    test("encodes the cursor and sends the limit", async () => {
      global.fetch.mockResolvedValue(respondWith(200, { properties: [], nextCursor: null }));

      await fetchReviewQueue({ cursor: "a/b+c=", limit: 10 });

      expect(global.fetch.mock.calls[0][0]).toBe(`${PROPERTY_API_BASE}/review/queue?cursor=a%2Fb%2Bc%3D&limit=10`);
    });

    test("requests the bare queue path and returns the cards and the next cursor", async () => {
      const card = { property: { id: "p1" } };
      global.fetch.mockResolvedValue(respondWith(200, { properties: [card], nextCursor: "next" }));

      expect(await fetchReviewQueue()).toEqual({ properties: [card], nextCursor: "next" });
      expect(global.fetch.mock.calls[0][0]).toBe(`${PROPERTY_API_BASE}/review/queue`);
    });

    test("normalizes a body without cards or cursor", async () => {
      global.fetch.mockResolvedValue(respondWith(200, {}));

      expect(await fetchReviewQueue()).toEqual({ properties: [], nextCursor: null });
    });
  });
});
