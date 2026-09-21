import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import {
  WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES,
  WebsitePublicQuoteError,
  requestPublicWebsiteQuote,
} from "../services/websitePublicQuoteService";

const QUOTE_REQUEST = {
  siteId: "site-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  sessionId: "visitor-1",
};

const QUOTE_RESPONSE = {
  quoteId: "quote_1",
  siteId: "site-1",
  propertyId: "property-1",
  timezone: null,
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  nights: 4,
  guestCount: 2,
  availability: { isAvailable: true, bookableFrom: "2026-10-01", bookableUntil: "2026-10-31", minimumStay: 2, maximumStay: null },
  priceBreakdown: { currency: "EUR", nightlyBaseTotal: 76000, cleaningFee: 5000, discounts: [], taxes: [], fees: [], total: 81000 },
  policiesApplied: ["minimum_stay", "availability_window"],
  expiresAt: "2026-10-01T10:30:00.000Z",
  quoteToken: "qtok_abc",
};

const mockFetchResponse = ({ ok = true, status = 200, body = "" } = {}) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  });
};

const expectQuoteError = async (promise, code) => {
  await expect(promise).rejects.toBeInstanceOf(WebsitePublicQuoteError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe("requestPublicWebsiteQuote", () => {
  afterEach(() => {
    delete global.fetch;
    globalThis.localStorage.clear();
  });

  it("posts the design-pack request body without any auth header", async () => {
    globalThis.localStorage.setItem("CognitoIdentityServiceProvider.abc.user.accessToken", "host-token");
    mockFetchResponse({ body: QUOTE_RESPONSE });

    await requestPublicWebsiteQuote(QUOTE_REQUEST);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(`${PROPERTY_API_BASE}/website/public/quote`);
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({
      siteId: "site-1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      guests: 2,
      currency: "EUR",
      session: { sessionId: "visitor-1", source: "standalone_site" },
    });
  });

  it("returns the normalized quote on success", async () => {
    mockFetchResponse({ body: QUOTE_RESPONSE });

    const quote = await requestPublicWebsiteQuote(QUOTE_REQUEST);

    expect(quote).toMatchObject({
      quoteId: "quote_1",
      nights: 4,
      guestCount: 2,
      priceBreakdown: { total: 81000, nightlyBaseTotal: 76000, cleaningFee: 5000, currency: "EUR" },
      expiresAt: "2026-10-01T10:30:00.000Z",
      quoteToken: "qtok_abc",
    });
  });

  it("surfaces the endpoint's error code, message, status and requestId", async () => {
    mockFetchResponse({
      ok: false,
      status: 409,
      body: { error: { code: "unavailable_dates", message: "The selected dates are not available.", requestId: "req-9" } },
    });

    const promise = requestPublicWebsiteQuote(QUOTE_REQUEST);
    await expectQuoteError(promise, "unavailable_dates");
    await expect(promise).rejects.toMatchObject({
      status: 409,
      message: "The selected dates are not available.",
      requestId: "req-9",
    });
  });

  it("maps an API Gateway throttle response to rate_limited", async () => {
    mockFetchResponse({ ok: false, status: 429, body: { message: "Too Many Requests" } });

    await expectQuoteError(requestPublicWebsiteQuote(QUOTE_REQUEST), WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.RATE_LIMITED);
  });

  it("maps a non-JSON failure body to unexpected_response", async () => {
    mockFetchResponse({ ok: false, status: 502, body: "<html>Bad Gateway</html>" });

    await expectQuoteError(
      requestPublicWebsiteQuote(QUOTE_REQUEST),
      WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE
    );
  });

  it("maps a success body that is not a quote to unexpected_response", async () => {
    mockFetchResponse({ body: { hello: "world" } });

    await expectQuoteError(
      requestPublicWebsiteQuote(QUOTE_REQUEST),
      WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE
    );
  });

  it("maps a network failure to network_error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expectQuoteError(requestPublicWebsiteQuote(QUOTE_REQUEST), WEBSITE_PUBLIC_QUOTE_CLIENT_ERROR_CODES.NETWORK_ERROR);
  });

  it("lets an abort propagate untouched so callers can ignore it", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(requestPublicWebsiteQuote(QUOTE_REQUEST)).rejects.toBe(abortError);
  });
});
