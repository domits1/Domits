import { requestChannex } from "../../hostintegrations/channexApi";
import { createConnectSession, getHostListings, normalizeListing, refreshChannels } from "./hostDistributionRealApi";

jest.mock("../../hostintegrations/channexApi", () => ({ requestChannex: jest.fn() }));

const NO_CHOICE = { required: false, options: [] };
const CHOICE = { required: true, options: ["Asia/Jakarta", "Asia/Makassar"] };

describe("normalizeListing", () => {
  test("moves the top-level readiness.missing and timezone into distribution", () => {
    const normalized = normalizeListing({
      propertyId: "p1",
      distribution: { status: "NOT_ENABLED" },
      readiness: { missing: ["MISSING_PRICE"] },
      timezone: CHOICE,
      channels: [{ otaCode: "Airbnb", label: "LIVE" }],
    });

    expect(normalized.distribution).toEqual({ status: "NOT_ENABLED", missing: ["MISSING_PRICE"], timezone: CHOICE });
    expect(normalized.channels).toEqual([{ otaCode: "Airbnb", label: "LIVE" }]);
  });

  test("keeps values already inside distribution over the top-level ones", () => {
    const normalized = normalizeListing({
      propertyId: "p1",
      distribution: { status: "READY", missing: ["MISSING_ADDRESS"], timezone: CHOICE },
      readiness: { missing: ["MISSING_PRICE"] },
      timezone: NO_CHOICE,
    });

    expect(normalized.distribution.missing).toEqual(["MISSING_ADDRESS"]);
    expect(normalized.distribution.timezone).toEqual(CHOICE);
  });

  test("defaults to nothing missing and no timezone choice when the fields are absent", () => {
    expect(normalizeListing({ propertyId: "p1", distribution: { status: "READY" } }).distribution).toEqual({
      status: "READY",
      missing: [],
      timezone: NO_CHOICE,
    });
    expect(normalizeListing({ propertyId: "p1" }).distribution).toEqual({ missing: [], timezone: NO_CHOICE });
  });

  test("returns a value that is not a listing unchanged", () => {
    expect(normalizeListing(undefined)).toBeUndefined();
  });
});

describe("hostDistributionRealApi", () => {
  beforeEach(() => requestChannex.mockReset());

  test("getHostListings normalizes every listing", async () => {
    requestChannex.mockResolvedValue({ listings: [{ propertyId: "p1", readiness: { missing: ["NOT_PUBLISHED"] } }] });

    const { listings } = await getHostListings();

    expect(requestChannex).toHaveBeenCalledWith("/integrations/channex/host/listings");
    expect(listings[0].distribution.missing).toEqual(["NOT_PUBLISHED"]);
  });

  test("getHostListings passes an answer without a list through, so the caller can reject it", async () => {
    requestChannex.mockResolvedValue({ unexpected: true });

    await expect(getHostListings()).resolves.toEqual({ unexpected: true });
  });

  test("refreshChannels posts to the listing and normalizes the listing it gets back", async () => {
    requestChannex.mockResolvedValue({ listing: { propertyId: "p 1", timezone: CHOICE } });

    const { listing } = await refreshChannels({ propertyId: "p 1" });

    expect(requestChannex).toHaveBeenCalledWith("/integrations/channex/host/listings/p%201/channels/refresh", {
      method: "POST",
    });
    expect(listing.distribution.timezone).toEqual(CHOICE);
  });

  test("createConnectSession posts to the listing and lets a request error through unchanged", async () => {
    const failure = Object.assign(new Error("nope"), { status: 409, responseBody: { errorCode: "X" } });
    requestChannex.mockRejectedValue(failure);

    await expect(createConnectSession({ propertyId: "p1" })).rejects.toBe(failure);
    expect(requestChannex).toHaveBeenCalledWith("/integrations/channex/host/listings/p1/connect-session", {
      method: "POST",
    });
  });
});
