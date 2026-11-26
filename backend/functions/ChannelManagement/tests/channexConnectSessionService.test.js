import ChannexConnectSessionService from "../../.shared/channelManagement/services/channexConnectSessionService.js";

// Design note D1 (#506): the host opens Channex's channel screen for one listing. The token is always
// requested for the listing's own Channex property, taken from its live mapping after the owner check;
// the browser never names a Channex property.
const listing = { propertyId: "listing-1", hostId: "host-1" };
const account = { id: "account-1", credentialsRef: "domits-channex-secret" };
const liveMapping = { id: "mapping-1", status: "ACTIVE", externalPropertyId: "channex-property-1" };

const build = ({ found = listing, hostAccount = account, mapping = liveMapping, secret = { apiKey: "key-1" } } = {}) => {
  const channex = { createOneTimeToken: jest.fn().mockResolvedValue({ success: true, token: "token-1" }) };
  const props = { findInUseByAccountAndListing: jest.fn().mockResolvedValue(mapping) };
  const service = new ChannexConnectSessionService({
    listings: { findListing: jest.fn().mockResolvedValue(found) },
    accounts: { findByUserIdAndChannel: jest.fn().mockResolvedValue(hostAccount) },
    props,
    channex,
    credentialStore: { readSecretOrNull: jest.fn().mockResolvedValue(secret) },
    channexBaseUrl: "https://staging.channex.io",
  });
  return { service, channex, props };
};

const open = (service, userId = "host-1") => service.createConnectSession({ userId, domitsPropertyId: "listing-1" });

describe("ChannexConnectSessionService.createConnectSession", () => {
  test("returns the Channex screen URL for the listing's own Channex property", async () => {
    const { service, channex } = build();

    const result = await open(service);

    expect(channex.createOneTimeToken).toHaveBeenCalledWith(
      { apiKey: "key-1" },
      { propertyId: "channex-property-1", username: "host-1" }
    );
    expect(result.statusCode).toBe(200);
    const url = new URL(result.response.iframeUrl);
    expect(url.searchParams.get("oauth_session_key")).toBe("token-1");
    expect(url.searchParams.get("property_id")).toBe("channex-property-1");
    // Channex's token lives 15 minutes; the frontend asks for a new one each time it opens the screen.
    expect(result.response.expiresInSeconds).toBe(900);
  });

  test.each([
    ["a listing that does not exist", { found: null }, 404, "DISTRIBUTION_LISTING_NOT_FOUND"],
    ["someone else's listing", { found: { ...listing, hostId: "host-2" } }, 403, "DISTRIBUTION_LISTING_NOT_OWNED"],
  ])("refuses %s without asking Channex", async (_label, options, statusCode, errorCode) => {
    const { service, channex } = build(options);

    const result = await open(service);

    expect(result).toEqual({ statusCode, response: expect.objectContaining({ errorCode }) });
    expect(channex.createOneTimeToken).not.toHaveBeenCalled();
  });

  // The Channex screen only makes sense once the listing exists in Channex (turn on first, D2).
  test.each([
    ["a host without a Channex account row", { hostAccount: null }],
    ["a listing without a mapping", { mapping: null }],
    ["a listing still being provisioned", { mapping: { ...liveMapping, status: "PROVISIONING" } }],
  ])("answers 409 turn on first for %s", async (_label, options) => {
    const { service, channex } = build(options);

    const result = await open(service);

    expect(result).toEqual({
      statusCode: 409,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_NOT_TURNED_ON" }),
    });
    expect(channex.createOneTimeToken).not.toHaveBeenCalled();
  });

  test("a missing Channex key answers 503 not configured", async () => {
    const { service } = build({ secret: null });

    expect((await open(service)).response.errorCode).toBe("DISTRIBUTION_NOT_CONFIGURED");
  });

  test("a failed token request answers 502 without the token or the key in the answer", async () => {
    const { service, channex } = build();
    channex.createOneTimeToken.mockResolvedValue({ success: false, errorCode: "CHANNEX_ONE_TIME_TOKEN_TIMEOUT" });

    const result = await open(service);

    expect(result).toEqual({
      statusCode: 502,
      response: expect.objectContaining({ errorCode: "DISTRIBUTION_CONNECT_SESSION_FAILED" }),
    });
    expect(JSON.stringify(result)).not.toContain("key-1");
  });
});
