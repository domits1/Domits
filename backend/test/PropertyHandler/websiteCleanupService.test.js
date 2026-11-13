import { describe, expect, it, jest } from "@jest/globals";
import { WebsiteCleanupService } from "../../functions/PropertyHandler/business/service/websiteCleanupService.js";

const candidate = (id, propertyStatus = "INACTIVE") => ({
  id,
  propertyId: `property-${id}`,
  hostId: `host-${id}`,
  propertyStatus,
});

const publishedSite = (id) => ({ id, propertyId: `property-${id}`, hostId: `host-${id}`, status: "PUBLISHED" });

const buildService = ({ candidates = [candidate("site-1")], truncated = false, reads = {} } = {}) => {
  const siteRepository = {
    listPublishedSitesOfInactiveProperties: jest.fn(async () => ({ sites: candidates, truncated })),
    getSiteById: jest.fn(async (id) => (reads.site ? reads.site(id) : publishedSite(id))),
  };
  const propertyRepository = {
    getPropertyById: jest.fn(async (id) => (reads.property ? reads.property(id) : { id, status: "INACTIVE" })),
  };
  const unpublisher = { takeDown: jest.fn(async () => ({})) };
  return {
    service: new WebsiteCleanupService({ siteRepository, propertyRepository, unpublisher }),
    siteRepository,
    propertyRepository,
    unpublisher,
  };
};

describe("WebsiteCleanupService.unpublishSitesOfInactiveListings", () => {
  it("lists what it would do and writes nothing by default", async () => {
    const { service, unpublisher, siteRepository } = buildService({
      candidates: [candidate("site-1"), candidate("site-2", null)],
    });

    const summary = await service.unpublishSitesOfInactiveListings();

    expect(unpublisher.takeDown).not.toHaveBeenCalled();
    expect(siteRepository.getSiteById).not.toHaveBeenCalled();
    expect(summary).toEqual({
      mode: "dry-run",
      candidates: 2,
      unpublished: 0,
      skipped: 0,
      errors: [],
      truncated: false,
      sites: [
        { siteId: "site-1", propertyId: "property-site-1", propertyStatus: "INACTIVE", outcome: "would-unpublish" },
        { siteId: "site-2", propertyId: "property-site-2", propertyStatus: "MISSING", outcome: "would-unpublish" },
      ],
    });
  });

  it.each(["true", 1, "yes", null, undefined, {}])(
    "stays a dry run when apply is %p, not the boolean true",
    async (apply) => {
      const { service, unpublisher } = buildService();

      const summary = await service.unpublishSitesOfInactiveListings({ apply });

      expect(summary.mode).toBe("dry-run");
      expect(unpublisher.takeDown).not.toHaveBeenCalled();
    }
  );

  it("takes each site down with the property_not_active reason when apply is true", async () => {
    const { service, unpublisher } = buildService({ candidates: [candidate("site-1"), candidate("site-2")] });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).toHaveBeenCalledTimes(2);
    expect(unpublisher.takeDown).toHaveBeenCalledWith({
      site: publishedSite("site-1"),
      hostId: "host-site-1",
      propertyId: "property-site-1",
      reason: "property_not_active",
    });
    expect(summary).toMatchObject({ mode: "apply", candidates: 2, unpublished: 2, skipped: 0, errors: [] });
    expect(summary.sites.map((site) => site.outcome)).toEqual(["unpublished", "unpublished"]);
  });

  it("takes down a site whose property row is missing", async () => {
    const { service, unpublisher } = buildService({
      candidates: [candidate("site-1", null)],
      reads: { property: () => null },
    });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).toHaveBeenCalledTimes(1);
    expect(summary.unpublished).toBe(1);
  });

  it("skips a site that is no longer PUBLISHED when re-read", async () => {
    const { service, unpublisher, propertyRepository } = buildService({
      reads: { site: (id) => ({ ...publishedSite(id), status: "PREVIEW" }) },
    });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).not.toHaveBeenCalled();
    expect(propertyRepository.getPropertyById).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ unpublished: 0, skipped: 1 });
    expect(summary.sites[0].outcome).toBe("skipped");
  });

  it("skips a site that was deleted since the candidate list was read", async () => {
    const { service, unpublisher } = buildService({ reads: { site: () => null } });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("skips a site whose property became ACTIVE again when re-read", async () => {
    const { service, unpublisher } = buildService({
      reads: { property: (id) => ({ id, status: "ACTIVE" }) },
    });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ unpublished: 0, skipped: 1 });
  });

  it("collects a failing site and still takes down the rest", async () => {
    const { service, unpublisher } = buildService({
      candidates: [candidate("site-1"), candidate("site-2"), candidate("site-3")],
    });
    unpublisher.takeDown.mockImplementation(async ({ site }) => {
      if (site.id === "site-2") {
        throw new Error("outbox write failed");
      }
    });

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(unpublisher.takeDown).toHaveBeenCalledTimes(3);
    expect(summary).toMatchObject({ candidates: 3, unpublished: 2, skipped: 0 });
    expect(summary.errors).toEqual([{ siteId: "site-2", message: "outbox write failed" }]);
    expect(summary.sites.map((site) => site.outcome)).toEqual(["unpublished", "failed", "unpublished"]);
  });

  it("collects a failing re-read the same way", async () => {
    const { service, siteRepository, unpublisher } = buildService({
      candidates: [candidate("site-1"), candidate("site-2")],
    });
    siteRepository.getSiteById
      .mockRejectedValueOnce(new Error("connection lost"))
      .mockImplementationOnce(async (id) => publishedSite(id));

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    expect(summary.errors).toEqual([{ siteId: "site-1", message: "connection lost" }]);
    expect(unpublisher.takeDown).toHaveBeenCalledTimes(1);
  });

  it("passes the truncated flag through", async () => {
    const { service } = buildService({ truncated: true });

    await expect(service.unpublishSitesOfInactiveListings()).resolves.toMatchObject({ truncated: true });
  });

  it.each([
    [undefined, 10],
    [null, 10],
    [0, 10],
    [-5, 10],
    ["abc", 10],
    [2.5, 10],
    [3, 3],
    [50, 50],
    [51, 50],
    [10000, 50],
  ])("asks the repository for limit %p as %p", async (limit, expected) => {
    const { service, siteRepository } = buildService({ candidates: [] });

    await service.unpublishSitesOfInactiveListings({ limit });

    expect(siteRepository.listPublishedSitesOfInactiveProperties).toHaveBeenCalledWith({ limit: expected });
  });

  it("keeps host ids, domains and tokens out of the summary", async () => {
    const { service } = buildService();

    const summary = await service.unpublishSitesOfInactiveListings({ apply: true });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("host-site-1");
    expect(serialized).not.toMatch(/domain|token|hostId/i);
  });
});
