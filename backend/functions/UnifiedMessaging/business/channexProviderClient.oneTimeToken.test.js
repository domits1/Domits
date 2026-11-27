const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");
const { buildChannexIframeUrl } = require("../.shared/channelManagement/utils/channexIframeUrl.js");

// Design note D1 (#506): the host connects OTAs in Channex's own screen. The backend asks for a one-time
// token for the host's own Channex property (Channex docs: single use, 15 minutes) and builds the URL.
describe("ChannexProviderClient.createOneTimeToken", () => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("asks Channex for a token for exactly one property and returns it", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: { token: "token-1" } }));

    const result = await client.createOneTimeToken(CREDENTIALS, { propertyId: "property-1", username: "host-1" });

    const [url, request] = global.fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/auth\/one_time_token$/);
    expect(request).toMatchObject({ method: "POST", headers: { "user-api-key": "test-api-key" } });
    expect(JSON.parse(request.body)).toEqual({ one_time_token: { property_id: "property-1", username: "host-1" } });
    expect(result).toEqual({ success: true, token: "token-1" });
  });

  test("refuses without an API key or a property, calling nothing", async () => {
    expect(await client.createOneTimeToken({}, { propertyId: "property-1", username: "host-1" })).toMatchObject({
      success: false,
      errorCode: "MISSING_API_KEY",
    });
    expect(await client.createOneTimeToken(CREDENTIALS, { username: "host-1" })).toMatchObject({
      success: false,
      errorCode: "MISSING_PROPERTY_ID",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("a refusal from Channex is a failure with its status", async () => {
    global.fetch.mockResolvedValue(jsonResponse(403, { errors: { code: "forbidden", title: "Forbidden" } }));

    expect(await client.createOneTimeToken(CREDENTIALS, { propertyId: "p", username: "h" })).toMatchObject({
      success: false,
      errorCode: "forbidden",
    });
  });

  test("an answer without a token is a failure", async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: {} }));

    expect(await client.createOneTimeToken(CREDENTIALS, { propertyId: "p", username: "h" })).toMatchObject({
      success: false,
      errorCode: "CHANNEX_ONE_TIME_TOKEN_INVALID_RESPONSE",
    });
  });

  test("a hanging call times out instead of holding the request", async () => {
    global.fetch = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );

    const result = await client.createOneTimeToken(CREDENTIALS, { propertyId: "p", username: "h" }, { requestTimeoutMs: 5 });

    expect(result).toMatchObject({ success: false, errorCode: "CHANNEX_ONE_TIME_TOKEN_TIMEOUT" });
  });
});

describe("buildChannexIframeUrl", () => {
  const url = new URL(
    buildChannexIframeUrl({ baseUrl: "https://staging.channex.io", token: "token-1", channexPropertyId: "property-1" })
  );

  test("opens Channex's channel screen without its own navigation, for this property", () => {
    expect(url.origin + url.pathname).toBe("https://staging.channex.io/auth/exchange");
    expect(url.searchParams.get("oauth_session_key")).toBe("token-1");
    expect(url.searchParams.get("app_mode")).toBe("headless");
    expect(url.searchParams.get("redirect_to")).toBe("/channels");
    expect(url.searchParams.get("property_id")).toBe("property-1");
  });

  // Only the three OTAs Domits supports can be connected (D6); Channex hides the rest.
  test("offers only Booking.com, Airbnb and Vrbo, in English", () => {
    expect(url.searchParams.get("channels")).toBe("BDC,ABB,VRB");
    expect(url.searchParams.get("lng")).toBe("en");
  });
});
