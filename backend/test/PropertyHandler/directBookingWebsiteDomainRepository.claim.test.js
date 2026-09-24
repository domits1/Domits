import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const ROW = {
  id: "domain-1",
  site_id: "site-1",
  domain: "www.example.com",
  domain_type: "CUSTOM",
  status: "PENDING",
  is_primary: false,
  verification_details_json: JSON.stringify({ tenantId: null, reason: "dns_required" }),
  last_checked_at: 1757000000000,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

const buildClient = (rows) => {
  const client = { options: { schema: "main" }, query: jest.fn().mockResolvedValue(rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const claim = (repository, siteId) =>
  repository.ensureDomain({
    siteId,
    domain: "www.example.com",
    domainType: "CUSTOM",
    status: "PENDING",
    isPrimary: false,
    verificationDetails: { tenantId: null, reason: "dns_required" },
  });

describe("DirectBookingWebsiteDomainRepository.ensureDomain ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("only updates an existing row when it belongs to the claiming site and never rewrites site_id", async () => {
    const client = buildClient([ROW]);

    const record = await claim(new DirectBookingWebsiteDomainRepository(), "site-1");

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain("ON CONFLICT (domain)");
    expect(statement).toContain("WHERE existing.site_id = EXCLUDED.site_id");
    const updateSet = statement.slice(statement.indexOf("DO UPDATE SET"), statement.indexOf("WHERE existing.site_id"));
    expect(updateSet).not.toContain("site_id = EXCLUDED.site_id");
    expect(parameters[1]).toBe("site-1");
    expect(record).toMatchObject({ id: "domain-1", siteId: "site-1", domain: "www.example.com" });
  });

  it("reports null when the row belongs to another site and the conflict update was refused", async () => {
    buildClient([]);

    await expect(claim(new DirectBookingWebsiteDomainRepository(), "site-2")).resolves.toBeNull();
  });
});
