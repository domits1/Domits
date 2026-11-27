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

  test("a channel carries only an otaCode and a label, as in the contract", async () => {
    const { listings } = await getHostListings();
    const channels = listings.flatMap((listing) => listing.channels);

    expect(channels.length).toBeGreaterThan(0);
    channels.forEach((channel) => expect(Object.keys(channel).sort()).toEqual(["label", "otaCode"]));
  });

  test("a listing keeps its missing items and timezone under distribution, with no readiness object", async () => {
    const { listings } = await getHostListings();

    listings.forEach((listing) => {
      expect(Object.keys(listing).sort()).toEqual(["channels", "distribution", "propertyId", "title"]);
      expect(Object.keys(listing.distribution).sort()).toEqual(["missing", "status", "timezone"]);
    });
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
    const answer = await refreshChannels({ propertyId: "mock-listing-live" });

    expect(Object.keys(answer)).toEqual(["listing"]);
    expect(Object.keys(answer.listing).sort()).toEqual(["channels", "distribution", "propertyId", "title"]);
    expect(answer.listing.propertyId).toBe("mock-listing-live");
    expect(answer.listing.channels.map((c) => [c.otaCode, c.label])).toEqual([
      ["BookingCom", "LIVE"],
      ["Airbnb", "LIVE"],
    ]);
    const mixed = await refreshChannels({ propertyId: "mock-listing-mixed" });
    expect(mixed.listing.channels.map((c) => c.label)).toEqual([
      "DISCONNECTING",
      "DISCONNECTED",
      "NEEDS_ATTENTION",
    ]);
  });

  test("refresh of an unknown listing rejects with a 404 shaped like a real request error", async () => {
    await expect(refreshChannels({ propertyId: "nope" })).rejects.toMatchObject({
      status: 404,
      method: "POST",
      responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" },
    });
  });

  test("a connect session is a Channex address that is good for 900 seconds", async () => {
    const session = await createConnectSession({ propertyId: "mock-listing-live" });

    expect(isChannexUrl(session.iframeUrl)).toBe(true);
    expect(session.expiresInSeconds).toBe(900);
    expect(Object.keys(session).sort()).toEqual(["expiresInSeconds", "iframeUrl"]);
  });

  test("a connect session for an unknown listing rejects with a 404", async () => {
    await expect(createConnectSession({ propertyId: "nope" })).rejects.toMatchObject({
      status: 404,
      responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" },
    });
  });

  test("a connect session for a listing that is not turned on rejects with a 409", async () => {
    await expect(createConnectSession({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
      status: 409,
      method: "POST",
      responseBody: { errorCode: "DISTRIBUTION_NOT_TURNED_ON" },
    });
  });

  describe("enableDistribution", () => {
    const statusOf = async (propertyId) => {
      const { listings } = await getHostListings();
      return listings.find((listing) => listing.propertyId === propertyId).distribution.status;
    };

    test("turns a listing on: the answer is only a status, the next read says READY, and a connect session works", async () => {
      const answer = await enableDistribution({ propertyId: "mock-listing-not-turned-on" });

      expect(answer).toEqual({ status: "PROVISIONED" });
      expect(await statusOf("mock-listing-not-turned-on")).toBe("READY");
      await expect(createConnectSession({ propertyId: "mock-listing-not-turned-on" })).resolves.toHaveProperty("iframeUrl");
    });

    test("is idempotent: a listing that is already READY answers ALREADY_CONNECTED and stays as it was", async () => {
      const before = (await getHostListings()).listings.find((listing) => listing.propertyId === "mock-listing-live");

      const answer = await enableDistribution({ propertyId: "mock-listing-live" });

      expect(answer).toEqual({ status: "ALREADY_CONNECTED" });
      const after = (await getHostListings()).listings.find((listing) => listing.propertyId === "mock-listing-live");
      expect(after).toEqual(before);
    });

    test("a listing in a multi-timezone country needs one of its options, and then no longer asks", async () => {
      const options = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"];
      await expect(enableDistribution({ propertyId: "mock-listing-needs-timezone" })).rejects.toMatchObject({
        status: 422,
        responseBody: { errorCode: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED", options },
      });
      await expect(
        enableDistribution({ propertyId: "mock-listing-needs-timezone", chosenTimezone: "Europe/Paris" })
      ).rejects.toMatchObject({
        status: 422,
        responseBody: { errorCode: "DISTRIBUTION_TIMEZONE_INVALID_CHOICE", options },
      });

      const answer = await enableDistribution({
        propertyId: "mock-listing-needs-timezone",
        chosenTimezone: "Asia/Makassar",
      });

      expect(answer).toEqual({ status: "PROVISIONED" });
      const { listings } = await getHostListings();
      const stored = listings.find((listing) => listing.propertyId === "mock-listing-needs-timezone");
      expect(stored.distribution).toMatchObject({ status: "READY", timezone: { required: false, options: [] } });
    });

    test("a listing that is not ready rejects with a 422 and stays off", async () => {
      await expect(enableDistribution({ propertyId: "mock-listing-not-ready" })).rejects.toMatchObject({
        status: 422,
        method: "POST",
        responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_READY", missing: ["MISSING_ADDRESS", "MISSING_PRICE"] },
      });
      expect(await statusOf("mock-listing-not-ready")).toBe("NOT_ENABLED");
    });

    test("a listing that is still provisioning is resumed by turning it on again", async () => {
      expect(await statusOf("mock-listing-provisioning")).toBe("PROVISIONING");

      await expect(enableDistribution({ propertyId: "mock-listing-provisioning" })).resolves.toEqual({
        status: "PROVISIONED",
      });

      expect(await statusOf("mock-listing-provisioning")).toBe("READY");
    });

    test("an unknown listing rejects with a 404", async () => {
      await expect(enableDistribution({ propertyId: "nope" })).rejects.toMatchObject({
        status: 404,
        responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" },
      });
    });

    test("the in-progress outcome rejects with a 409 and leaves the listing provisioning", async () => {
      setMockEnableOutcome("in-progress");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 409,
        responseBody: { errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS" },
      });
      expect(await statusOf("mock-listing-not-turned-on")).toBe("PROVISIONING");
    });

    test("the try-again outcome answers a 503 once and leaves the listing provisioning, then turning on resumes", async () => {
      setMockEnableOutcome("try-again");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 503,
        responseBody: { errorCode: "DISTRIBUTION_TRY_AGAIN" },
      });
      expect(await statusOf("mock-listing-not-turned-on")).toBe("PROVISIONING");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).resolves.toEqual({
        status: "PROVISIONED",
      });
      expect(await statusOf("mock-listing-not-turned-on")).toBe("READY");
    });

    test("the not-ready outcome rejects with a 422 and the listing then reads as not ready", async () => {
      setMockEnableOutcome("not-ready");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 422,
        responseBody: { errorCode: "DISTRIBUTION_LISTING_NOT_READY" },
      });

      const { listings } = await getHostListings();
      const stored = listings.find((listing) => listing.propertyId === "mock-listing-not-turned-on");
      expect(stored.distribution.missing).toEqual(["MISSING_PRICE"]);
    });

    test("the timezone-required outcome rejects with a 422 and the listing then asks for a timezone", async () => {
      setMockEnableOutcome("timezone-required");

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).rejects.toMatchObject({
        status: 422,
        responseBody: { errorCode: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED" },
      });

      const { listings } = await getHostListings();
      const stored = listings.find((listing) => listing.propertyId === "mock-listing-not-turned-on");
      expect(stored.distribution.timezone.required).toBe(true);
    });

    test("resetting the mock also resets the outcome", async () => {
      setMockEnableOutcome("in-progress");
      resetMockHostDistribution();

      await expect(enableDistribution({ propertyId: "mock-listing-not-turned-on" })).resolves.toEqual({
        status: "PROVISIONED",
      });
    });
  });
});
