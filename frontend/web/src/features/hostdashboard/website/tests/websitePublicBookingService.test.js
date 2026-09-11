import {
  DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE,
  WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES,
  WebsitePublicBookingError,
  requestPublicSiteBooking,
} from "../services/websitePublicBookingService";

const BOOKING_REQUEST = {
  siteId: "site-1",
  quoteToken: "qtok_abc",
  guest: { name: "Guest Name", email: "guest@example.com" },
  sessionId: "visitor-1",
  idempotencyKey: "idem-1",
};

const BOOKING_RESPONSE = {
  publicBookingRef: "DBW-ABCDEFGHJK",
  status: "REQUESTED",
  siteId: "site-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  total: 81000,
  currency: "EUR",
};

const mockFetchResponse = ({ ok = true, status = 201, body = "" } = {}) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  });
};

const expectBookingError = async (promise, code) => {
  await expect(promise).rejects.toBeInstanceOf(WebsitePublicBookingError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe("requestPublicSiteBooking", () => {
  afterEach(() => {
    delete global.fetch;
    globalThis.localStorage.clear();
  });

  it("posts the request with the Idempotency-Key header and no auth header", async () => {
    globalThis.localStorage.setItem("CognitoIdentityServiceProvider.abc.user.accessToken", "host-token");
    mockFetchResponse({ body: BOOKING_RESPONSE });

    await requestPublicSiteBooking(BOOKING_REQUEST);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE}/public/sites/site-1/bookings`);
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toEqual({ "Content-Type": "application/json", "Idempotency-Key": "idem-1" });
    expect(JSON.parse(options.body)).toEqual({
      quoteToken: "qtok_abc",
      guest: { name: "Guest Name", email: "guest@example.com" },
      session: { sessionId: "visitor-1", source: "standalone_site" },
    });
  });

  it("encodes the site id in the path", async () => {
    mockFetchResponse({ body: BOOKING_RESPONSE });

    await requestPublicSiteBooking({ ...BOOKING_REQUEST, siteId: "site/one" });

    expect(global.fetch.mock.calls[0][0]).toBe(
      `${DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE}/public/sites/site%2Fone/bookings`
    );
  });

  it("returns the normalized booking request on success", async () => {
    mockFetchResponse({ body: BOOKING_RESPONSE });

    await expect(requestPublicSiteBooking(BOOKING_REQUEST)).resolves.toEqual(BOOKING_RESPONSE);
  });

  it("surfaces the endpoint's error code, message, status and requestId", async () => {
    mockFetchResponse({
      ok: false,
      status: 409,
      body: { error: { code: "quote_expired", message: "Your quote is no longer valid.", requestId: "req-9" } },
    });

    const promise = requestPublicSiteBooking(BOOKING_REQUEST);
    await expectBookingError(promise, "quote_expired");
    await expect(promise).rejects.toMatchObject({
      status: 409,
      message: "Your quote is no longer valid.",
      requestId: "req-9",
    });
  });

  it("maps an API Gateway throttle response to rate_limited", async () => {
    mockFetchResponse({ ok: false, status: 429, body: { message: "Too Many Requests" } });

    await expectBookingError(
      requestPublicSiteBooking(BOOKING_REQUEST),
      WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.RATE_LIMITED
    );
  });

  it("maps a non-JSON failure body to unexpected_response", async () => {
    mockFetchResponse({ ok: false, status: 502, body: "<html>Bad Gateway</html>" });

    await expectBookingError(
      requestPublicSiteBooking(BOOKING_REQUEST),
      WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE
    );
  });

  it("maps a success body without a booking reference to unexpected_response", async () => {
    mockFetchResponse({ body: { status: "REQUESTED" } });

    await expectBookingError(
      requestPublicSiteBooking(BOOKING_REQUEST),
      WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE
    );
  });

  it("maps a network failure to network_error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expectBookingError(
      requestPublicSiteBooking(BOOKING_REQUEST),
      WEBSITE_PUBLIC_BOOKING_CLIENT_ERROR_CODES.NETWORK_ERROR
    );
  });

  it("lets an abort propagate untouched so callers can ignore it", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(requestPublicSiteBooking(BOOKING_REQUEST)).rejects.toBe(abortError);
  });
});
