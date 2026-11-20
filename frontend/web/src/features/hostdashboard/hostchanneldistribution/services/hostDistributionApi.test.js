import {
  MOCK_HOST_DISTRIBUTION_ENABLED,
  createConnectSession,
  enableDistribution,
  getHostListings,
  refreshChannels,
  resetMockHostDistribution,
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

  test("refresh moves a syncing channel to live and leaves the other channels alone", async () => {
    const { listing } = await refreshChannels({ propertyId: "mock-listing-live" });

    expect(listing.channels.map((c) => [c.otaCode, c.displayState])).toEqual([
      ["BookingCom", "LIVE"],
      ["Airbnb", "LIVE"],
    ]);
    const mixed = await refreshChannels({ propertyId: "mock-listing-mixed" });
    expect(mixed.listing.channels.map((c) => c.displayState)).toEqual([
      "DISCONNECTING",
      "DISCONNECTED",
      "NEEDS_ATTENTION",
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
});
