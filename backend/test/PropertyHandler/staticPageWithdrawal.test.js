import { describe, it, expect, jest } from "@jest/globals";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";

const FALLBACK = { domain: "cliff-house-site-1.direct.domits.com", domainType: "FALLBACK", status: "DISABLED" };
const CUSTOM = { domain: "www.cliffhouse.nl", domainType: "CUSTOM", status: "ACTIVE" };
const WILDCARD_TENANT = { id: "dt_wildcard", domains: ["*.direct.domits.com", "developers.domits.com"] };

const buildWithdrawal = ({
  tenants = [WILDCARD_TENANT],
  tenantByDomain = { [CUSTOM.domain]: { id: "dt_custom" } },
} = {}) => {
  const pageStore = { deletePage: jest.fn(async () => undefined) };
  const tenantRepository = {
    listTenantsForDistribution: jest.fn(async () => tenants),
    getTenantByDomain: jest.fn(async (domain) => tenantByDomain[domain] || null),
    createInvalidation: jest.fn(async () => "I1"),
  };
  const withdrawal = new StaticPageWithdrawal({ pageStore, tenantRepository, distributionId: "E18DIST" });
  return { withdrawal, pageStore, tenantRepository };
};

describe("StaticPageWithdrawal", () => {
  it("deletes the page of every domain of the site, whatever its status, then invalidates each on its own tenant", async () => {
    const { withdrawal, pageStore, tenantRepository } = buildWithdrawal();

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] });

    expect(pageStore.deletePage.mock.calls.map(([call]) => call.hostname)).toEqual([FALLBACK.domain, CUSTOM.domain]);
    expect(tenantRepository.listTenantsForDistribution).toHaveBeenCalledWith("E18DIST");
    expect(tenantRepository.createInvalidation.mock.calls.map(([call]) => [call.tenantId, call.paths])).toEqual([
      ["dt_wildcard", [`/sites/by-host/${FALLBACK.domain}/index.html`, "/", "/index.html"]],
      ["dt_custom", [`/sites/by-host/${CUSTOM.domain}/index.html`, "/", "/index.html"]],
    ]);
    expect(result).toEqual({ siteId: "site-1", hostnames: [FALLBACK.domain, CUSTOM.domain], invalidationErrors: [] });
  });

  it("refuses a hostname that cannot be a page key before touching the bucket", async () => {
    const { withdrawal, pageStore } = buildWithdrawal();

    await expect(
      withdrawal.withdraw({ siteId: "site-1", domains: [CUSTOM, { domain: "Cliff House/../index" }] })
    ).rejects.toThrow(TypeError);
    expect(pageStore.deletePage).not.toHaveBeenCalled();
  });

  it("stops at the first delete that fails and invalidates nothing, so the retry deletes everything again", async () => {
    const { withdrawal, pageStore, tenantRepository } = buildWithdrawal();
    pageStore.deletePage.mockRejectedValueOnce(new Error("AccessDenied"));

    await expect(withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] })).rejects.toThrow(
      "AccessDenied"
    );

    expect(pageStore.deletePage).toHaveBeenCalledTimes(1);
    expect(tenantRepository.createInvalidation).not.toHaveBeenCalled();
  });

  it("reports a hostname no tenant serves and a failed invalidation instead of failing the withdrawal", async () => {
    const { withdrawal, tenantRepository } = buildWithdrawal({
      tenants: [],
      tenantByDomain: { [CUSTOM.domain]: { id: "dt_custom" } },
    });
    tenantRepository.createInvalidation.mockRejectedValueOnce(new Error("TooManyInvalidationsInProgress"));

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] });

    expect(result.hostnames).toEqual([FALLBACK.domain, CUSTOM.domain]);
    expect(result.invalidationErrors).toEqual([
      { hostname: FALLBACK.domain, message: "no tenant serves this hostname" },
      { tenantId: "dt_custom", message: "TooManyInvalidationsInProgress" },
    ]);
  });

  it("skips the tenant lookup when no distribution is configured, and says so per hostname", async () => {
    const pageStore = { deletePage: jest.fn(async () => undefined) };
    const tenantRepository = {
      listTenantsForDistribution: jest.fn(),
      getTenantByDomain: jest.fn(async () => null),
      createInvalidation: jest.fn(),
    };
    const withdrawal = new StaticPageWithdrawal({ pageStore, tenantRepository, distributionId: "" });

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK] });

    expect(tenantRepository.listTenantsForDistribution).not.toHaveBeenCalled();
    expect(result.invalidationErrors).toEqual([
      { hostname: FALLBACK.domain, message: "no tenant serves this hostname" },
    ]);
  });

  it("invalidates a domain only once when the site lists it twice", async () => {
    const { withdrawal, pageStore, tenantRepository } = buildWithdrawal();

    await withdrawal.withdraw({ siteId: "site-1", domains: [CUSTOM, { ...CUSTOM, status: "REMOVING" }] });

    expect(pageStore.deletePage).toHaveBeenCalledTimes(1);
    expect(tenantRepository.createInvalidation).toHaveBeenCalledTimes(1);
  });
});
