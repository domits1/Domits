import ChannexDistributionListingsService from "../../.shared/channelManagement/services/channexDistributionListingsService.js";

// Design note D7 and section 6 (#506): after the Channex screen closes, the tab reads the listing again.
// The answer is one listing in the shape Rakib's cards read; the channels come live from Channex.
const listing = {
  propertyId: "listing-1",
  hostId: "host-1",
  status: "ACTIVE",
  title: "Villa Malee",
  location: { country: "Netherlands" },
  guests: 4,
  roomRate: 150,
};
const account = { id: "account-1", credentialsRef: "domits-channex-secret" };
const live = { id: "mapping-1", status: "ACTIVE", externalPropertyId: "channex-property-1" };

const build = ({ found = listing, hostAccount = account, mapping = live, channels = null, waiting = false } = {}) => {
  const channex = {
    listChannels: jest.fn().mockResolvedValue(
      channels ?? {
        success: true,
        channels: [
          { channexChannelId: "c1", otaCode: "BookingCom", isActive: true },
          { channexChannelId: "c2", otaCode: "Airbnb", isActive: false },
        ],
      }
    ),
  };
  const service = new ChannexDistributionListingsService({
    listings: { findListing: jest.fn().mockResolvedValue(found) },
    accounts: { findByUserIdAndChannel: jest.fn().mockResolvedValue(hostAccount) },
    props: { findInUseByAccountAndListing: jest.fn().mockResolvedValue(mapping) },
    outbox: { hasWaitingRows: jest.fn().mockResolvedValue(waiting) },
    channex,
    credentialStore: { readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "key-1" }) },
  });
  return { service, channex };
};

const refresh = (service) => service.refreshListing({ userId: "host-1", domitsPropertyId: "listing-1" });

describe("ChannexDistributionListingsService.refreshListing", () => {
  test("a live listing comes back READY with a label per connected OTA", async () => {
    const { service, channex } = build();

    const result = await refresh(service);

    expect(channex.listChannels).toHaveBeenCalledWith({ apiKey: "key-1" }, "channex-property-1");
    expect(result).toEqual({
      statusCode: 200,
      response: {
        listing: expect.objectContaining({
          propertyId: "listing-1",
          title: "Villa Malee",
          readiness: { ready: true, missing: [] },
          distribution: { status: "READY" },
          channels: [
            { channexChannelId: "c1", otaCode: "BookingCom", label: "LIVE" },
            { channexChannelId: "c2", otaCode: "Airbnb", label: "DISCONNECTED" },
          ],
        }),
      },
    });
  });

  test("an active OTA shows SYNCING while the listing still has outbox rows waiting", async () => {
    const { service } = build({ waiting: true });

    const { listing: answered } = (await refresh(service)).response;

    expect(answered.channels[0].label).toBe("SYNCING");
  });

  test.each([
    ["no account row", { hostAccount: null }, "NOT_ENABLED"],
    ["no mapping", { mapping: null }, "NOT_ENABLED"],
    ["a claim still being set up", { mapping: { ...live, status: "PROVISIONING" } }, "PROVISIONING"],
  ])("with %s the listing is %s and Channex is not asked", async (_label, options, status) => {
    const { service, channex } = build(options);

    const { listing: answered } = (await refresh(service)).response;

    expect(answered.distribution).toEqual({ status });
    expect(answered.channels).toEqual([]);
    expect(channex.listChannels).not.toHaveBeenCalled();
  });

  // The tab still loads when Channex does not answer; the host sees "unknown", never a guessed "Live".
  test("when Channex does not answer, the channels are unavailable instead of guessed", async () => {
    const { service } = build({ channels: { success: false, channels: [], errorCode: "CHANNEX_CHANNELS_TIMEOUT" } });

    const { listing: answered } = (await refresh(service)).response;

    expect(answered.distribution).toEqual({ status: "READY" });
    expect(answered.channels).toEqual([]);
    expect(answered.channelsUnavailable).toBe(true);
  });

  test("when the Channex key cannot be read, the channels are unavailable and the tab still loads", async () => {
    const { service } = build();
    service.credentialStore.readSecretOrNull.mockRejectedValue(new Error("Secrets Manager unreachable"));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await refresh(service);

    expect(result.statusCode).toBe(200);
    expect(result.response.listing.channelsUnavailable).toBe(true);
    log.mockRestore();
  });

  test.each([
    ["a listing that does not exist", { found: null }, 404],
    ["someone else's listing", { found: { ...listing, hostId: "host-2" } }, 403],
  ])("refuses %s", async (_label, options, statusCode) => {
    const { service, channex } = build(options);

    expect((await refresh(service)).statusCode).toBe(statusCode);
    expect(channex.listChannels).not.toHaveBeenCalled();
  });
});
