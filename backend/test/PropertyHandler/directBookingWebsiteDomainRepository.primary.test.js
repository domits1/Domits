import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const FALLBACK_ROW = {
  id: "domain-0",
  site_id: "site-1",
  domain: "villa-site1.direct.domits.com",
  domain_type: "FALLBACK",
  status: "ACTIVE",
  is_primary: false,
  verification_details_json: "{}",
  last_checked_at: 1757000000000,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};
const CUSTOM_ROW = {
  ...FALLBACK_ROW,
  id: "domain-1",
  domain: "www.example.com",
  domain_type: "CUSTOM",
  is_primary: true,
  verification_details_json: JSON.stringify({ tenantId: "dt_1" }),
};

const buildClient = (records) => {
  const queryRunner = {
    query: jest.fn(async (statement, parameters, useStructuredResult) =>
      useStructuredResult ? { records, affected: records.length } : [records, records.length]
    ),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    options: { schema: "main" },
    createQueryRunner: () => queryRunner,
    query: jest.fn(async () => records),
  };
  Database.getInstance.mockResolvedValue(client);
  return { client, queryRunner };
};

describe("DirectBookingWebsiteDomainRepository main address statements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("promotes in one statement that only touches rows of the site while the target is a live custom domain", async () => {
    const { queryRunner } = buildClient([FALLBACK_ROW, CUSTOM_ROW]);

    const records = await new DirectBookingWebsiteDomainRepository().promoteDomainToPrimary("site-1", "domain-1");

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    const [statement, parameters, useStructuredResult] = queryRunner.query.mock.calls[0];
    expect(statement).toMatch(/UPDATE\s+\S+standalone_site_domain/);
    expect(statement).toContain("is_primary = (id = $2)");
    expect(statement).toContain("WHERE site_id = $1");
    expect(statement).toContain("is_primary IS DISTINCT FROM (id = $2)");
    expect(statement).toContain("candidate.domain_type = 'CUSTOM'");
    expect(statement).toContain("candidate.status = 'ACTIVE'");
    expect(parameters).toEqual(["site-1", "domain-1", expect.any(Number)]);
    expect(useStructuredResult).toBe(true);
    expect(records.map((record) => [record.id, record.isPrimary])).toEqual([
      ["domain-0", false],
      ["domain-1", true],
    ]);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when the statement changed nothing", async () => {
    buildClient([]);

    await expect(
      new DirectBookingWebsiteDomainRepository().promoteDomainToPrimary("site-1", "domain-1")
    ).resolves.toEqual([]);
  });

  it("restores the fallback as main address with one statement scoped to the site", async () => {
    const { queryRunner } = buildClient([
      { ...FALLBACK_ROW, is_primary: true },
      { ...CUSTOM_ROW, is_primary: false },
    ]);

    const records = await new DirectBookingWebsiteDomainRepository().restoreFallbackDomainAsPrimary("site-1");

    const [statement, parameters] = queryRunner.query.mock.calls[0];
    expect(statement).toContain("is_primary = (domain_type = 'FALLBACK')");
    expect(statement).toContain("WHERE site_id = $1");
    expect(statement).toContain("is_primary IS DISTINCT FROM (domain_type = 'FALLBACK')");
    expect(parameters).toEqual(["site-1", expect.any(Number)]);
    expect(records.map((record) => [record.domainType, record.isPrimary])).toEqual([
      ["FALLBACK", true],
      ["CUSTOM", false],
    ]);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it("keeps the stored main address flag when an existing domain row is upserted", async () => {
    const { client } = buildClient([FALLBACK_ROW]);

    await new DirectBookingWebsiteDomainRepository().ensureDomain({
      siteId: "site-1",
      domain: FALLBACK_ROW.domain,
      domainType: "FALLBACK",
      status: "ACTIVE",
      isPrimary: true,
    });

    const [statement] = client.query.mock.calls[0];
    expect(statement).toContain("is_primary = existing.is_primary");
    expect(statement).not.toContain("is_primary = EXCLUDED.is_primary");
  });
});
