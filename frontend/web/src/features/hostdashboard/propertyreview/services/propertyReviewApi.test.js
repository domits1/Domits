import { PROPERTY_API_BASE } from "../../../../services/propertyApiConfig";
import { getAccessToken } from "../../../../services/getAccessToken";
import {
  PropertyReviewApiError,
  REVIEW_API_ERROR_CODE,
  approveListing,
  fetchReviewDetail,
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

const pendingUntilAborted = (url, { signal }) =>
  new Promise((resolve, reject) => {
    const abort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    if (signal.aborted) abort();
    signal.addEventListener("abort", abort);
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
      const caller = new AbortController();
      global.fetch.mockResolvedValue(respondWith(200, { ok: true }));

      const body = await requestPropertyReview("/review/access", { signal: caller.signal });

      expect(body).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/review/access`, {
        method: "GET",
        headers: { Authorization: "raw-access-token" },
        signal: expect.any(AbortSignal),
      });
    });

    test("aborts the request when the caller aborts", async () => {
      const caller = new AbortController();
      global.fetch.mockImplementation(pendingUntilAborted);

      const request = captureError(() => requestPropertyReview("/review/queue", { signal: caller.signal }));
      caller.abort();

      expect((await request).name).toBe("AbortError");
    });

    test("fails as unavailable when the request takes longer than 15 seconds", async () => {
      jest.useFakeTimers();
      global.fetch.mockImplementation(pendingUntilAborted);

      const request = captureError(() => requestPropertyReview("/review/queue"));
      jest.advanceTimersByTime(15000);
      const error = await request;
      jest.useRealTimers();

      expect(error).toBeInstanceOf(PropertyReviewApiError);
      expect(error).toMatchObject({ status: 0, code: REVIEW_API_ERROR_CODE.UNAVAILABLE });
    });

    test("leaves no timer running once a request settles", async () => {
      jest.useFakeTimers();
      global.fetch.mockResolvedValue(respondWith(200, { ok: true }));

      const body = await requestPropertyReview("/review/queue");
      const pendingTimers = jest.getTimerCount();
      jest.useRealTimers();

      expect(body).toEqual({ ok: true });
      expect(pendingTimers).toBe(0);
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
      const original = new TypeError("Failed to fetch");
      global.fetch.mockRejectedValue(original);

      const error = await captureError(() => requestPropertyReview("/review/queue"));

      expect(error).toMatchObject({ status: 0, code: REVIEW_API_ERROR_CODE.NETWORK });
      expect(error.cause).toBe(original);
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

  describe("fetchReviewDetail", () => {
    test("encodes the property id and returns the body", async () => {
      const detail = { property: { id: "a/b" } };
      global.fetch.mockResolvedValue(respondWith(200, detail));

      expect(await fetchReviewDetail("a/b", { signal: new AbortController().signal })).toEqual(detail);
      expect(global.fetch.mock.calls[0][0]).toBe(`${PROPERTY_API_BASE}/review/detail?propertyId=a%2Fb`);
    });

    test("maps a 404 to NOT_FOUND", async () => {
      global.fetch.mockResolvedValue(respondWith(404, { message: "Not found" }));

      const error = await captureError(() => fetchReviewDetail("p1"));

      expect(error.code).toBe(REVIEW_API_ERROR_CODE.NOT_FOUND);
      expect(error.status).toBe(404);
    });
  });

  describe("POST requests", () => {
    test("sends the method, a JSON body, the content type and the raw access token", async () => {
      global.fetch.mockResolvedValue(respondWith(200, { ok: true }));

      await requestPropertyReview("/review/approve", { method: "POST", body: { propertyId: "p1" } });

      expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/review/approve`, {
        method: "POST",
        headers: { Authorization: "raw-access-token", "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: "p1" }),
        signal: expect.any(AbortSignal),
      });
    });

    test.each([
      [409, { message: "Changed", code: "stale_review" }, REVIEW_API_ERROR_CODE.STALE_REVIEW],
      [409, { message: "Reviewed", code: "wrong_status" }, REVIEW_API_ERROR_CODE.WRONG_STATUS],
      [409, { message: "Odd", code: "something_else" }, REVIEW_API_ERROR_CODE.SERVER],
      [409, { message: "No code" }, REVIEW_API_ERROR_CODE.SERVER],
      [400, { message: "Reason is required" }, REVIEW_API_ERROR_CODE.BAD_REQUEST],
      [503, { message: "Try again" }, REVIEW_API_ERROR_CODE.UNAVAILABLE],
    ])("maps a %s response with %j to %s and keeps the server message", async (status, body, code) => {
      global.fetch.mockResolvedValue(respondWith(status, body));

      const error = await captureError(() => requestPropertyReview("/review/approve", { method: "POST", body: {} }));

      expect(error).toBeInstanceOf(PropertyReviewApiError);
      expect(error.code).toBe(code);
      expect(error.message).toBe(body.message);
    });
  });

  describe("approveListing", () => {
    test("posts the property id and the updated-at it was loaded with", async () => {
      global.fetch.mockResolvedValue(respondWith(200, { propertyId: "p1", status: "LIVE", updatedAt: 2 }));

      const body = await approveListing("p1", 1);

      expect(body).toEqual({ propertyId: "p1", status: "LIVE", updatedAt: 2 });
      expect(global.fetch).toHaveBeenCalledWith(
        `${PROPERTY_API_BASE}/review/approve`,
        expect.objectContaining({ method: "POST", body: JSON.stringify({ propertyId: "p1", updatedAt: 1 }) })
      );
    });
  });
});
