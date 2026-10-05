import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";

const ROW = {
  id: "domain-1",
  site_id: "site-1",
  domain: "www.example.com",
  domain_type: "CUSTOM",
  status: "ACTIVE",
  is_primary: true,
  verification_details_json: '{"tenantId":"dt_1"}',
  created_at: "1",
  updated_at: "2",
  site_status: "PUBLISHED",
  site_static_page_revision: null,
};

describe("DirectBookingWebsiteDomainRepository.listDomainsWithSites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("joins every domain with its site, reads a missing revision as 0, and looks one domain up lower-cased", async () => {
    const client = {
      options: { schema: "main" },
      query: jest.fn(async () => [ROW, { ...ROW, id: "domain-2", site_static_page_revision: "4" }]),
    };
    Database.getInstance.mockResolvedValue(client);
    const repository = new DirectBookingWebsiteDomainRepository();

    const entries = await repository.listDomainsWithSites();

    expect(client.query.mock.calls[0][0]).toContain(
      `JOIN ${SCHEMA}.standalone_site AS site ON site.id = domain_entry.site_id`
    );
    expect(entries).toEqual([
      expect.objectContaining({
        id: "domain-1",
        verificationDetails: { tenantId: "dt_1" },
        site: { id: "site-1", status: "PUBLISHED", staticPageRevision: 0 },
      }),
      expect.objectContaining({ id: "domain-2", site: { id: "site-1", status: "PUBLISHED", staticPageRevision: 4 } }),
    ]);

    client.query.mockResolvedValueOnce([ROW]).mockResolvedValueOnce([]);
    expect(await repository.getDomainWithSiteByName(" WWW.Example.com ")).toMatchObject({ domain: "www.example.com" });
    expect(client.query.mock.calls[1][1]).toEqual(["www.example.com"]);
    expect(await repository.getDomainWithSiteByName("nobody.example")).toBeNull();
  });
});
