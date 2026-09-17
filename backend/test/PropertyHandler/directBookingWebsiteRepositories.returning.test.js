import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const DOMAIN_ROW = {
  id: "domain-1",
  site_id: "site-1",
  domain: "www.example.com",
  domain_type: "CUSTOM",
  status: "VERIFIED",
  is_primary: false,
  verification_details_json: JSON.stringify({ tenantId: "dt_1", reason: "certificate_issued" }),
  last_checked_at: 1757000000000,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

const SITE_ROW = {
  id: "site-1",
  property_id: "property-1",
  host_id: "host-1",
  site_name: "Cliff House",
  primary_locale: "en",
  status: "PREVIEW",
  template_key: "panorama",
  published_property_snapshot_json: "{}",
  published_content_overrides_json: "{}",
  published_theme_overrides_json: "{}",
  preview_token_hash: null,
  published_at: null,
  suspended_at: null,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

const buildClient = (records) => {
  const queryRunner = {
    query: jest.fn(async (statement, parameters, useStructuredResult) =>
      useStructuredResult
        ? { records, affected: records.length, raw: [records, records.length] }
        : [records, records.length]
    ),
    release: jest.fn().mockResolvedValue(undefined),
  };
  return {
    options: { schema: "main" },
    queryRunner,
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(async () => {
      throw new Error("DataSource.query must not be used for UPDATE or DELETE reads");
    }),
  };
};

const structuredCall = (client) => {
  expect(client.queryRunner.release).toHaveBeenCalledTimes(client.createQueryRunner.mock.calls.length);
  return client.queryRunner.query.mock.calls[0];
};

describe("direct booking website repositories read UPDATE and DELETE results through the structured result", () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const withRows = (records) => {
    client = buildClient(records);
    Database.getInstance.mockResolvedValue(client);
  };

  it("updateDomainStatusById maps the returned row and reports null when nothing matched", async () => {
    withRows([DOMAIN_ROW]);
    const repository = new DirectBookingWebsiteDomainRepository();

    const record = await repository.updateDomainStatusById("domain-1", "site-1", "verified", { tenantId: "dt_1" });

    expect(structuredCall(client)[2]).toBe(true);
    expect(structuredCall(client)[1]).toEqual(["domain-1", "site-1", "VERIFIED", expect.any(String), expect.any(Number)]);
    expect(record).toMatchObject({
      id: "domain-1",
      siteId: "site-1",
      domain: "www.example.com",
      status: "VERIFIED",
      verificationDetails: { tenantId: "dt_1", reason: "certificate_issued" },
    });

    withRows([]);
    await expect(repository.updateDomainStatusById("domain-1", "site-2", "verified", {})).resolves.toBeNull();
  });

  it("updateDomainVerificationDetailsById maps the returned row and reports null when nothing matched", async () => {
    withRows([DOMAIN_ROW]);
    const repository = new DirectBookingWebsiteDomainRepository();

    const record = await repository.updateDomainVerificationDetailsById("domain-1", "site-1", { lastError: "x" });

    expect(structuredCall(client)[2]).toBe(true);
    expect(record).toMatchObject({ id: "domain-1", domain: "www.example.com", status: "VERIFIED" });

    withRows([]);
    await expect(repository.updateDomainVerificationDetailsById("domain-1", "site-2", {})).resolves.toBeNull();
  });

  it("updateFallbackDomainStatus maps the returned row and reports null when the site has no fallback row", async () => {
    withRows([{ ...DOMAIN_ROW, domain_type: "FALLBACK", is_primary: true, status: "DISABLED" }]);
    const repository = new DirectBookingWebsiteDomainRepository();

    const record = await repository.updateFallbackDomainStatus("site-1", "disabled", { activationMode: "internal" });

    expect(structuredCall(client)[2]).toBe(true);
    expect(record).toMatchObject({ domainType: "FALLBACK", isPrimary: true, status: "DISABLED" });

    withRows([]);
    await expect(repository.updateFallbackDomainStatus("site-9", "disabled", {})).resolves.toBeNull();
  });

  it("deleteDomainById reports whether a row really went", async () => {
    withRows([{ id: "domain-1" }]);
    const repository = new DirectBookingWebsiteDomainRepository();

    await expect(repository.deleteDomainById("domain-1", "site-1")).resolves.toBe(true);
    expect(structuredCall(client)[2]).toBe(true);

    withRows([]);
    await expect(repository.deleteDomainById("domain-1", "site-2")).resolves.toBe(false);
  });

  it("releases the query runner when the statement throws", async () => {
    withRows([]);
    client.queryRunner.query.mockRejectedValueOnce(new Error("connection lost"));
    const repository = new DirectBookingWebsiteDomainRepository();

    await expect(repository.updateDomainStatusById("domain-1", "site-1", "verified", {})).rejects.toThrow(
      "connection lost"
    );
    expect(client.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it("updateSiteStatus maps the returned site and reports null when the site is gone", async () => {
    withRows([SITE_ROW]);
    const repository = new DirectBookingWebsiteSiteRepository();

    const site = await repository.updateSiteStatus("site-1", "preview");

    expect(structuredCall(client)[2]).toBe(true);
    expect(site).toMatchObject({ id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PREVIEW" });

    withRows([]);
    await expect(repository.updateSiteStatus("site-9", "preview")).resolves.toBeNull();
  });

  it("deleteSiteByPropertyIdAndHostId maps the deleted site and reports null when nothing matched", async () => {
    withRows([SITE_ROW]);
    const repository = new DirectBookingWebsiteSiteRepository();

    const site = await repository.deleteSiteByPropertyIdAndHostId("property-1", "host-1");

    expect(structuredCall(client)[2]).toBe(true);
    expect(site).toMatchObject({ id: "site-1", siteName: "Cliff House" });

    withRows([]);
    await expect(repository.deleteSiteByPropertyIdAndHostId("property-1", "host-2")).resolves.toBeNull();
  });
});
