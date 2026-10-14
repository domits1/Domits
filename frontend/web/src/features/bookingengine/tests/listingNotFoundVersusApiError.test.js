import FetchPropertyById from "../listingdetails/services/fetchPropertyById";
import {
  LISTING_NOT_FOUND,
  LISTING_REQUEST_FAILED,
  isListingNotFoundError,
} from "../listingdetails/services/listingErrors";

const respondWith = ({ status = 200, body = {}, json } = {}) => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: json || (() => Promise.resolve(body)),
  });
};

const codeOf = async (promise) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error.code;
  }
};

describe("telling a removed listing apart from a broken api", () => {
  const previousFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = previousFetch;
    jest.restoreAllMocks();
  });

  it("returns the listing when the api answers 200", async () => {
    respondWith({ body: { property: { id: "abc", title: "Villa Aura", status: "ACTIVE" } } });

    await expect(FetchPropertyById("abc")).resolves.toMatchObject({ property: { title: "Villa Aura" } });
  });

  it("reports not found only when the api answers 404", async () => {
    respondWith({ status: 404, body: "Property abc not found or inactive." });

    const code = await codeOf(FetchPropertyById("abc"));

    expect(code).toBe(LISTING_NOT_FOUND);
    expect(isListingNotFoundError({ code })).toBe(true);
  });

  it("treats a server error as a failure that can be retried, never as removed", async () => {
    for (const status of [500, 502, 503, 504, 429, 400, 401, 403]) {
      respondWith({ status, body: "nope" });

      const code = await codeOf(FetchPropertyById("abc"));

      expect(code).toBe(LISTING_REQUEST_FAILED);
      expect(isListingNotFoundError({ code })).toBe(false);
    }
  });

  it("treats a network failure as retryable, never as removed", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const code = await codeOf(FetchPropertyById("abc"));

    expect(code).toBeUndefined();
    expect(isListingNotFoundError({ code })).toBe(false);
  });

  it("treats an unreadable body as retryable, never as removed", async () => {
    respondWith({ json: () => Promise.reject(new SyntaxError("Unexpected token")) });

    expect(await codeOf(FetchPropertyById("abc"))).toBe(LISTING_REQUEST_FAILED);
  });

  it("refuses a 200 whose body is not a listing object, instead of rendering an empty one", async () => {
    for (const body of ["Property abc not found or inactive.", null, 42, ["a"]]) {
      respondWith({ body });

      expect(await codeOf(FetchPropertyById("abc"))).toBe(LISTING_REQUEST_FAILED);
    }
  });

  it("does not swallow the 404 the real api sends as a json string", async () => {
    respondWith({ status: 404, json: () => Promise.resolve("Property abc not found or inactive.") });

    expect(await codeOf(FetchPropertyById("abc"))).toBe(LISTING_NOT_FOUND);
  });
});
