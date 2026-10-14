import {
  clearBookingIdempotencyKey,
  getOrCreateBookingIdempotencyKey,
  resolveBookingIdempotencyStorageKey,
} from "../rendering/booking/bookingRequestIdempotency";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("booking request idempotency key", () => {
  afterEach(() => {
    globalThis.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("creates a UUID key and persists it per site", () => {
    const key = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });

    expect(key).toMatch(UUID_PATTERN);
    const stored = JSON.parse(globalThis.localStorage.getItem(resolveBookingIdempotencyStorageKey("site-1")));
    expect(stored).toMatchObject({ quoteId: "quote_1", idempotencyKey: key });
    expect(typeof stored.createdAt).toBe("number");
  });

  it("returns the same key for the same quote so a retry replays instead of double-booking", () => {
    const first = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });
    const second = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });

    expect(second).toBe(first);
  });

  it("rotates the key when the quote changes", () => {
    const first = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });
    const second = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_2" });

    expect(second).not.toBe(first);
    expect(JSON.parse(globalThis.localStorage.getItem(resolveBookingIdempotencyStorageKey("site-1")))).toMatchObject({
      quoteId: "quote_2",
      idempotencyKey: second,
    });
  });

  it("keeps sites apart", () => {
    const siteOne = getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });
    const siteTwo = getOrCreateBookingIdempotencyKey({ siteId: "site-2", quoteId: "quote_1" });

    expect(siteTwo).not.toBe(siteOne);
  });

  it("clears the stored key after a successful request", () => {
    getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" });

    clearBookingIdempotencyKey("site-1");

    expect(globalThis.localStorage.getItem(resolveBookingIdempotencyStorageKey("site-1"))).toBeNull();
  });

  it("falls back to crypto.getRandomValues when randomUUID is unavailable", () => {
    const originalRandomUuid = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true, writable: true });
    const getRandomValues = jest.spyOn(globalThis.crypto, "getRandomValues");

    try {
      const key = getOrCreateBookingIdempotencyKey({ siteId: "site-7", quoteId: "quote_1" });
      expect(key).toMatch(UUID_PATTERN);
      expect(getRandomValues).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: originalRandomUuid,
        configurable: true,
        writable: true,
      });
    }
  });

  it("regenerates when the stored value is corrupt", () => {
    globalThis.localStorage.setItem(resolveBookingIdempotencyStorageKey("site-1"), "{not json");

    expect(getOrCreateBookingIdempotencyKey({ siteId: "site-1", quoteId: "quote_1" })).toMatch(UUID_PATTERN);
  });

  it("still returns a stable key within the session when storage is unavailable", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const first = getOrCreateBookingIdempotencyKey({ siteId: "site-9", quoteId: "quote_1" });
    const second = getOrCreateBookingIdempotencyKey({ siteId: "site-9", quoteId: "quote_1" });

    expect(first).toMatch(UUID_PATTERN);
    expect(second).toBe(first);
  });
});
