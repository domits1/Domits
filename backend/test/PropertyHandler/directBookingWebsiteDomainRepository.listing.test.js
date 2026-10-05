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
  last_checked_at: "1",
  created_at: "1",
  updated_at: "2",
  site_status: "PUBLISHED",
  site_static_page_revision: null,
};

describe("DirectBookingWebsiteDomainRepository.listDomainsWithSites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("joins every domain with the status and revision of its site, reading a missing revision as 0", async () => {
    const client = {
      options: { schema: "main" },
      query: jest.fn(async () => [ROW, { ...ROW, id: "domain-2", site_static_page_revision: "4" }]),
    };
    Database.getInstance.mockResolvedValue(client);

    const entries = await new DirectBookingWebsiteDomainRepository().listDomainsWithSites();

    const [statement] = client.query.mock.calls[0];
    expect(statement).toContain(`FROM ${SCHEMA}.standalone_site_domain AS domain_entry`);
    expect(statement).toContain(`JOIN ${SCHEMA}.standalone_site AS site ON site.id = domain_entry.site_id`);
    expect(entries).toEqual([
      expect.objectContaining({
        id: "domain-1",
        siteId: "site-1",
        domain: "www.example.com",
        verificationDetails: { tenantId: "dt_1" },
        site: { id: "site-1", status: "PUBLISHED", staticPageRevision: 0 },
      }),
      expect.objectContaining({ id: "domain-2", site: { id: "site-1", status: "PUBLISHED", staticPageRevision: 4 } }),
    ]);
  });

  it("looks one domain up with its site, lower-cased, and answers null for an unknown one", async () => {
    const client = { options: { schema: "main" }, query: jest.fn(async () => [ROW]) };
    Database.getInstance.mockResolvedValue(client);
    const repository = new DirectBookingWebsiteDomainRepository();

    const entry = await repository.getDomainWithSiteByName(" WWW.Example.com ");

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain("WHERE domain_entry.domain = $1");
    expect(statement).toContain("LIMIT 1");
    expect(parameters).toEqual(["www.example.com"]);
    expect(entry).toMatchObject({ domain: "www.example.com", site: { status: "PUBLISHED" } });

    client.query.mockResolvedValueOnce([]);
    expect(await repository.getDomainWithSiteByName("nobody.example")).toBeNull();
  });
});
