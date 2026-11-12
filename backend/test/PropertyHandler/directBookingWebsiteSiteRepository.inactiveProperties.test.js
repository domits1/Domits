import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const withRows = (rows) => {
  const client = { options: { schema: "main" }, query: jest.fn(async () => rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const row = (id, propertyStatus) => ({
  id,
  property_id: `property-${id}`,
  host_id: `host-${id}`,
  property_status: propertyStatus,
});

describe("DirectBookingWebsiteSiteRepository.listPublishedSitesOfInactiveProperties", () => {
  it("selects published sites whose property is missing or not ACTIVE, lowest id first", async () => {
    const client = withRows([]);

    await new DirectBookingWebsiteSiteRepository().listPublishedSitesOfInactiveProperties({ limit: 10 });

    const [statement] = client.query.mock.calls[0];
    expect(statement).toContain("FROM test.standalone_site s");
    expect(statement).toContain("LEFT JOIN test.property p ON p.id = s.property_id");
    expect(statement).toContain("s.status = 'PUBLISHED'");
    expect(statement).toContain("p.id IS NULL OR p.status IS DISTINCT FROM 'ACTIVE'");
    expect(statement).toContain("ORDER BY s.id ASC");
  });

  it("maps rows and keeps a site without a property row, with a null property status", async () => {
    withRows([row("site-1", "INACTIVE"), row("site-2", null)]);

    const result = await new DirectBookingWebsiteSiteRepository().listPublishedSitesOfInactiveProperties({ limit: 10 });

    expect(result).toEqual({
      sites: [
        { id: "site-1", propertyId: "property-site-1", hostId: "host-site-1", propertyStatus: "INACTIVE" },
        { id: "site-2", propertyId: "property-site-2", hostId: "host-site-2", propertyStatus: null },
      ],
      truncated: false,
    });
  });

  it("asks for one row more than the limit and reports truncation without returning the extra row", async () => {
    const client = withRows([row("a", "INACTIVE"), row("b", "INACTIVE"), row("c", "INACTIVE")]);

    const result = await new DirectBookingWebsiteSiteRepository().listPublishedSitesOfInactiveProperties({ limit: 2 });

    expect(client.query.mock.calls[0][1]).toEqual([3]);
    expect(result.sites.map((site) => site.id)).toEqual(["a", "b"]);
    expect(result.truncated).toBe(true);
  });

  it.each([undefined, 0, -1, 1.5, "abc"])(
    "rejects the limit %p instead of running an unbounded query",
    async (limit) => {
      const client = withRows([]);

      await expect(
        new DirectBookingWebsiteSiteRepository().listPublishedSitesOfInactiveProperties({ limit })
      ).rejects.toThrow("limit must be a positive integer.");
      expect(client.query).not.toHaveBeenCalled();
    }
  );
});
