import ChannexDistributionListingsService from "../../.shared/channelManagement/services/channexDistributionListingsService.js";

// Section 6 (#506): GET /host/listings, one card per listing, in the same shape as refresh. The timezone
// question is in it, so the tab knows before turning on whether to ask the host (D4).
const listing = (propertyId, country = "Netherlands", overrides = {}) => ({
  propertyId,
  hostId: "host-1",
  status: "ACTIVE",
  title: `Listing ${propertyId}`,
  location: { country },
  guests: 4,
  roomRate: 150,
  ...overrides,
});
const account = { id: "account-1", credentialsRef: "domits-channex-secret" };

const build = ({ hostListings, hostAccount = account, mappings = {} } = {}) => {
  const channex = {
    listChannels: jest.fn().mockResolvedValue({
      success: true,
      channels: [{ channexChannelId: "c1", otaCode: "BookingCom", isActive: true }],
    }),
  };
  const service = new ChannexDistributionListingsService({
    listings: { findListingsByHost: jest.fn().mockResolvedValue(hostListings) },
    accounts: { findByUserIdAndChannel: jest.fn().mockResolvedValue(hostAccount) },
    props: { findInUseByAccountAndListing: jest.fn(async (_accountId, propertyId) => mappings[propertyId] ?? null) },
    outbox: { hasWaitingRows: jest.fn().mockResolvedValue(false) },
    channex,
    credentialStore: { readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "key-1" }) },
  });
  return { service, channex };
};

describe("ChannexDistributionListingsService.listHostListings", () => {
  test("describes every listing; Channex is only asked for the live ones", async () => {
    const { service, channex } = build({
      hostListings: [listing("a"), listing("b"), listing("c", "Netherlands", { status: "INACTIVE" })],
      mappings: { a: { status: "ACTIVE", externalPropertyId: "channex-a" }, b: { status: "PROVISIONING" } },
    });

    const result = await service.listHostListings({ userId: "host-1" });

    expect(result.statusCode).toBe(200);
    const byId = Object.fromEntries(result.response.listings.map((card) => [card.propertyId, card]));
    expect(byId.a).toMatchObject({ distribution: { status: "READY" }, channels: [{ otaCode: "BookingCom", label: "LIVE" }] });
    expect(byId.b).toMatchObject({ distribution: { status: "PROVISIONING" }, channels: [] });
    expect(byId.c).toMatchObject({
      distribution: { status: "NOT_ENABLED" },
      readiness: { ready: false, missing: ["NOT_PUBLISHED"] },
    });
    expect(channex.listChannels).toHaveBeenCalledTimes(1);
  });

  test("a host without a Channex account row sees every listing as not turned on", async () => {
    const { service, channex } = build({ hostListings: [listing("a")], hostAccount: null });

    const { listings } = (await service.listHostListings({ userId: "host-1" })).response;

    expect(listings[0].distribution).toEqual({ status: "NOT_ENABLED" });
    expect(channex.listChannels).not.toHaveBeenCalled();
  });

  test("a host without listings gets an empty list", async () => {
    const { service } = build({ hostListings: [] });

    expect(await service.listHostListings({ userId: "host-1" })).toEqual({ statusCode: 200, response: { listings: [] } });
  });

  test.each([
    ["Netherlands", { required: false, options: [] }],
    ["Spain", { required: true, options: expect.arrayContaining(["Europe/Madrid", "Atlantic/Canary"]) }],
  ])("a listing in %s carries its timezone question", async (country, timezone) => {
    const { service } = build({ hostListings: [listing("a", country)] });

    const { listings } = (await service.listHostListings({ userId: "host-1" })).response;

    expect(listings[0].timezone).toEqual(timezone);
  });
});
