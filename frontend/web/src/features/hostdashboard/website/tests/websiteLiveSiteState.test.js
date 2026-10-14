import {
  buildWebsiteDraftPreviewCacheKeyMap,
  reloadListingDetailsAfterPublish,
  resolveWebsiteDraftLiveSiteState,
} from "../services/websiteLiveSiteState";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";

jest.mock("../services/websiteSiteService", () => ({ fetchWebsiteSiteByPropertyId: jest.fn() }));
jest.mock("../services/websitePropertyService", () => ({ fetchWebsitePropertyDetails: jest.fn() }));

const DRAFT = { propertyId: "property-1", updatedAt: "2026-09-15T10:00:00Z", templateKey: "panorama" };
const LISTING = { property: { title: "Cliff House" }, pricing: { roomRate: 190 } };
const publishedSummary = (snapshot) => ({
  site: { id: "site-1", status: "PUBLISHED", publishedAt: 1757600000000, publishedPropertySnapshot: snapshot },
});

describe("resolveWebsiteDraftLiveSiteState", () => {
  it("reports staleness when the site check succeeds", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue(publishedSummary({ ...LISTING, pricing: { roomRate: 210 } }));

    await expect(resolveWebsiteDraftLiveSiteState(DRAFT, LISTING)).resolves.toEqual({
      isStale: true,
      publishedAt: 1757600000000,
    });
  });

  it("returns a not stale result for a draft without a live site", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue(null);

    await expect(resolveWebsiteDraftLiveSiteState(DRAFT, LISTING)).resolves.toEqual({
      isStale: false,
      publishedAt: null,
    });
  });

  it("returns null instead of a not stale result when the check fails", async () => {
    fetchWebsiteSiteByPropertyId.mockRejectedValue(new Error("network"));

    await expect(resolveWebsiteDraftLiveSiteState(DRAFT, LISTING)).resolves.toBeNull();
    await expect(resolveWebsiteDraftLiveSiteState(DRAFT, null)).resolves.toBeNull();
    expect(fetchWebsiteSiteByPropertyId).toHaveBeenCalledTimes(1);
  });
});

describe("buildWebsiteDraftPreviewCacheKeyMap", () => {
  it("leaves failed checks out of the cache so the next run retries them", () => {
    const entries = [
      ["property-1", {}, "key-1", { isStale: false, publishedAt: null }],
      ["property-2", {}, "key-2", null],
      ["property-3", {}, "key-3", { isStale: true, publishedAt: 1 }],
    ];

    expect(buildWebsiteDraftPreviewCacheKeyMap(entries)).toEqual({ "property-1": "key-1", "property-3": "key-3" });
  });
});

describe("reloadListingDetailsAfterPublish", () => {
  it("returns the freshly fetched listing", async () => {
    fetchWebsitePropertyDetails.mockResolvedValue(LISTING);

    await expect(reloadListingDetailsAfterPublish("property-1", publishedSummary({}))).resolves.toBe(LISTING);
    expect(fetchWebsitePropertyDetails).toHaveBeenCalledWith("property-1");
  });

  it("falls back to the snapshot the publish just stored when the fetch fails", async () => {
    fetchWebsitePropertyDetails.mockRejectedValue(new Error("network"));

    await expect(reloadListingDetailsAfterPublish("property-1", publishedSummary(LISTING))).resolves.toBe(LISTING);
    await expect(reloadListingDetailsAfterPublish("property-1", null)).resolves.toBeNull();
  });
});
