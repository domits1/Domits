import {
  MOCK_HOST_DISTRIBUTION_ENABLED,
  createConnectSession,
  getHostListings,
  refreshChannels,
  resetMockHostDistribution,
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
});
