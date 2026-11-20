import {
  MOCK_HOST_DISTRIBUTION_ENABLED,
  createConnectSession,
  disconnectChannel,
  enableDistribution,
  getHostListings,
  refreshChannels,
  resetMockHostDistribution,
  setMockDisconnectOutcome,
  setMockEnableOutcome,
} from "./hostDistributionApi";
import { isChannexUrl } from "../utils/channexUrl";

describe("hostDistributionApi (mock)", () => {
  beforeEach(() => {
    resetMockHostDistribution();
    // The mock waits to feel like a network call; the tests do not need to.
    jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
      callback();
      return 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("stays off by default, so a real host never sees mock data", () => {
    expect(MOCK_HOST_DISTRIBUTION_ENABLED).toBe(false);
  });

  test("returns copies: changing a response does not change the mock", async () => {
    const first = await getHostListings();
    first.listings[0].title = "Changed by a caller";
    first.listings[0].channels.length = 0;

    const second = await getHostListings();

    expect(second.listings[0].title).toBe("Canal House");
    expect(second.listings[0].channels.length).toBeGreaterThan(0);
  });

  test("refresh moves a syncing channel to live and a disconnecting one to disconnected, and leaves the others alone", async () => {
    const { listing } = await refreshChannels({ propertyId: "mock-listing-live" });

    expect(listing.channels.map((c) => [c.otaCode, c.displayState])).toEqual([
      ["BookingCom", "LIVE"],
      ["Airbnb", "LIVE"],
    ]);
    const mixed = await refreshChannels({ propertyId: "mock-listing-mixed" });
    expect(mixed.listing.channels.map((c) => [c.status, c.displayState])).toEqual([
      ["DISCONNECTED", "DISCONNECTED"],
      ["DISCONNECTED", "DISCONNECTED"],
      ["ERROR", "NEEDS_ATTENTION"],
    ]);
  });

  test("refresh of an unknown listing rejects with a 404 shaped like a real request error", async () => {
    await expect(refreshChannels({ propertyId: "nope" })).rejects.toMatchObject({
      status: 404,
      method: "POST",
      responseBody: { errorCode: "LISTING_NOT_FOUND" },
    });
  });

  test("a connect session is a Channex address with an expiry in the future", async () => {
    const session = await createConnectSession({ propertyId: "mock-listing-live" });

    expect(isChannexUrl(session.url)).toBe(true);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  test("a connect session for an unknown listing rejects with a 404", async () => {
    await expect(createConnectSession({ propertyId: "nope" })).rejects.toMatchObject({
      status: 404,
      responseBody: { errorCode: "LISTING_NOT_FOUND" },
    });
  });

  test("a connect session for a listing that is not turned on rejects with a 409", async () => {
    await expect(createConnectSession({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
      status: 409,
      method: "POST",
      responseBody: { errorCode: "DISTRIBUTION_NOT_ENABLED" },
    });
  });

  describe("enableDistribution", () => {
    const statusOf = async (propertyId) => {
      const { listings } = await getHostListings();
      return listings.find((listing) => listing.propertyId === propertyId).distribution.status;
    };

    test("turns a listing on: the answer and the next read both say READY, and a connect session works", async () => {
      const { listing } = await enableDistribution({ propertyId: "mock-listing-not-turned-on" });

      expect(listing.distribution.status).toBe("READY");
      expect(await statusOf("mock-listing-not-turned-on")).toBe("READY");
      await expect(createConnectSession({ propertyId: "mock-listing-not-turned-on" })).resolves.toHaveProperty("url");
    });

    test("is idempotent: a listing that is already READY comes back unchanged", async () => {
      const before = (await getHostListings()).listings.find((listing) => listing.propertyId === "mock-listing-live");

      const { listing } = await enableDistribution({ propertyId: "mock-listing-live" });

      expect(listing).toEqual(before);
    });

    test("a listing in a multi-timezone country needs one of its options, and then no longer asks", async () => {
      const rejection = { status: 400, responseBody: { errorCode: "TIMEZONE_REQUIRED" } };
      await expect(enableDistribution({ propertyId: "mock-listing-needs-timezone" })).rejects.toMatchObject(rejection);
      await expect(
        enableDistribution({ propertyId: "mock-listing-needs-timezone", timezone: "Europe/Paris" })
      ).rejects.toMatchObject(rejection);

      const { listing } = await enableDistribution({
        propertyId: "mock-listing-needs-timezone",
        timezone: "Asia/Makassar",
      });

      expect(listing.distribution.status).toBe("READY");
      expect(listing.timezone).toEqual({ required: false, options: [] });
    });

    test("a listing that is not ready rejects with a 422 and stays off", async () => {
      await expect(enableDistribution({ propertyId: "mock-listing-not-ready" })).rejects.toMatchObject({
        status: 422,
        method: "POST",
        responseBody: { errorCode: "LISTING_NOT_READY" },
      });
      expect(await statusOf("mock-listing-not-ready")).toBe("NOT_ENABLED");
    });

    test("a listing that is still provisioning rejects with a 409, and Refresh then finishes it", async () => {
      await expect(enableDistribution({ propertyId: "mock-listing-provisioning" })).rejects.toMatchObject({
        status: 409,
        responseBody: { errorCode: "PROVISIONING_IN_PROGRESS" },
      });

      const { listing } = await refreshChannels({ propertyId: "mock-listing-provisioning" });

      expect(listing.distribution.status).toBe("READY");
    });

    test("an unknown listing rejects with a 404", async () => {
      await expect(enableDistribution({ propertyId: "nope" })).rejects.toMatchObject({
        status: 404,
        responseBody: { errorCode: "LISTING_NOT_FOUND" },
      });
    });

    test.each([
      ["in-progress", 409, "PROVISIONING_IN_PROGRESS", "PROVISIONING"],
      ["failed", 500, "PROVISIONING_FAILED", "PROVISIONING_FAILED"],
    ])("the %s outcome rejects with %i %s and leaves the listing %s", async (outcome, status, errorCode, stored) => {
      setMockEnableOutcome(outcome);

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status,
        responseBody: { errorCode },
      });
      expect(await statusOf("mock-listing-not-turned-on")).toBe(stored);
    });

    test("the not-ready outcome rejects with a 422 and the listing then reads as not ready", async () => {
      setMockEnableOutcome("not-ready");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 422,
      });

      const { listings } = await getHostListings();
      const stored = listings.find((listing) => listing.propertyId === "mock-listing-not-turned-on");
      expect(stored.readiness.ready).toBe(false);
    });

    test("the timezone-required outcome rejects with a 400 and the listing then asks for a timezone", async () => {
      setMockEnableOutcome("timezone-required");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 400,
        responseBody: { errorCode: "TIMEZONE_REQUIRED" },
      });

      const { listings } = await getHostListings();
      const stored = listings.find((listing) => listing.propertyId === "mock-listing-not-turned-on");
      expect(stored.timezone.required).toBe(true);
    });

    test("a listing that failed halfway is tried again and then succeeds", async () => {
      await expect(enableDistribution({ propertyId: "mock-listing-setup-failed" })).resolves.toMatchObject({
        listing: { distribution: { status: "READY" } },
      });
    });

    test("resetting the mock also resets the outcome", async () => {
      setMockEnableOutcome("failed");
      resetMockHostDistribution();

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).resolves.toHaveProperty("listing");
    });
  });

  describe("disconnectChannel", () => {
    const LIVE_CHANNEL = "mock-channel-BookingCom";
    const channelOf = async (propertyId, channelId) => {
      const { listings } = await getHostListings();
      return listings
        .find((listing) => listing.propertyId === propertyId)
        ?.channels.find((c) => c.channelId === channelId);
    };

    test("answers at once with the channel DISCONNECTING, and the next read agrees", async () => {
      const { listing } = await disconnectChannel({ channelId: LIVE_CHANNEL });

      const answered = listing.channels.find((c) => c.channelId === LIVE_CHANNEL);
      expect([answered.status, answered.displayState]).toEqual(["DISCONNECTING", "DISCONNECTING"]);
      expect((await channelOf("mock-listing-live", LIVE_CHANNEL)).displayState).toBe("DISCONNECTING");
    });

    test("leaves the listing's other channels alone", async () => {
      const { listing } = await disconnectChannel({ channelId: LIVE_CHANNEL });

      expect(listing.channels.find((c) => c.otaCode === "Airbnb").displayState).toBe("SYNCING");
    });

    test("a Refresh afterwards shows it DISCONNECTED", async () => {
      await disconnectChannel({ channelId: LIVE_CHANNEL });

      const { listing } = await refreshChannels({ propertyId: "mock-listing-live" });

      expect(listing.channels.find((c) => c.channelId === LIVE_CHANNEL).displayState).toBe("DISCONNECTED");
    });

    test("is idempotent: a channel that is already off comes back unchanged", async () => {
      const before = (await getHostListings()).listings.find((l) => l.propertyId === "mock-listing-mixed");

      const { listing } = await disconnectChannel({ channelId: "mock-channel-mixed-Airbnb" });

      expect(listing).toEqual(before);
    });

    test("a channel that is already being disconnected rejects with a 409", async () => {
      await expect(disconnectChannel({ channelId: "mock-channel-mixed-BookingCom" })).rejects.toMatchObject({
        status: 409,
        method: "POST",
        responseBody: { errorCode: "DISCONNECT_IN_PROGRESS" },
      });
    });

    test("an unknown channel rejects with a 404", async () => {
      await expect(disconnectChannel({ channelId: "nope" })).rejects.toMatchObject({
        status: 404,
        responseBody: { errorCode: "CHANNEL_NOT_FOUND" },
      });
    });

    test("channel ids are unique across the fixtures, so one id never matches two listings", async () => {
      const { listings } = await getHostListings();
      const ids = listings.flatMap((listing) => listing.channels.map((c) => c.channelId));

      expect(new Set(ids).size).toBe(ids.length);
    });

    test.each([
      ["in-progress", 409, "DISCONNECT_IN_PROGRESS", "DISCONNECTING"],
      ["failed", 500, "DISCONNECT_FAILED", "NEEDS_ATTENTION"],
    ])("the %s outcome rejects with %i %s and leaves the channel %s", async (outcome, status, errorCode, stored) => {
      setMockDisconnectOutcome(outcome);

      await expect(disconnectChannel({ channelId: LIVE_CHANNEL })).rejects.toMatchObject({
        status,
        responseBody: { errorCode },
      });
      expect((await channelOf("mock-listing-live", LIVE_CHANNEL)).displayState).toBe(stored);
    });

    test("the not-found outcome rejects with a 404 and the channel is gone on the next read", async () => {
      setMockDisconnectOutcome("not-found");

      await expect(disconnectChannel({ channelId: LIVE_CHANNEL })).rejects.toMatchObject({ status: 404 });
      expect(await channelOf("mock-listing-live", LIVE_CHANNEL)).toBeUndefined();
    });

    test("some channels have upcoming bookings and some have none, for the confirm dialog", async () => {
      const { listings } = await getHostListings();
      const counts = listings.flatMap((listing) => listing.channels.map((c) => c.upcomingBookingCount));

      expect(counts).toContain(0);
      expect(counts.some((count) => count > 1)).toBe(true);
      expect(counts).toContain(1);
    });

    test("resetting the mock also resets the outcome", async () => {
      setMockDisconnectOutcome("failed");
      resetMockHostDistribution();

      await expect(disconnectChannel({ channelId: LIVE_CHANNEL })).resolves.toHaveProperty("listing");
    });
  });
});
