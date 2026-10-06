import { describe, it, expect, jest } from "@jest/globals";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";

const FALLBACK = { domain: "cliff-house-site-1.direct.domits.com", domainType: "FALLBACK", status: "DISABLED" };
const CUSTOM = { domain: "www.cliffhouse.nl", domainType: "CUSTOM", status: "ACTIVE" };
const WILDCARD_TENANT = { id: "dt_wildcard", domains: ["*.direct.domits.com", "developers.domits.com"] };

const buildWithdrawal = ({
  tenants = [WILDCARD_TENANT],
  tenantByDomain = { [CUSTOM.domain]: { id: "dt_custom" } },
  domains = [FALLBACK, CUSTOM],
  distributionId = "E18DIST",
} = {}) => {
  const pageStore = { deletePage: jest.fn(async () => undefined) };
  const tenantRepository = {
    listTenantsForDistribution: jest.fn(async () => tenants),
    getTenantByDomain: jest.fn(async (domain) => tenantByDomain[domain] || null),
    createInvalidation: jest.fn(async () => "I1"),
  };
  const domainRepository = { listDomainsBySiteId: jest.fn(async () => domains) };
  const withdrawal = new StaticPageWithdrawal({ pageStore, tenantRepository, domainRepository, distributionId });
  return { withdrawal, pageStore, tenantRepository, domainRepository };
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

  it("withdraws a site by its stored domains, read from the domain repository", async () => {
    const { withdrawal, pageStore, domainRepository } = buildWithdrawal();

    const result = await withdrawal.withdrawSite("site-1");

    expect(domainRepository.listDomainsBySiteId).toHaveBeenCalledWith("site-1");
    expect(pageStore.deletePage).toHaveBeenCalledTimes(2);
    expect(result.hostnames).toEqual([FALLBACK.domain, CUSTOM.domain]);
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

  it("deletes the second key on the retry after the first succeeded and the second failed", async () => {
    const { withdrawal, pageStore } = buildWithdrawal();
    pageStore.deletePage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("SlowDown"));

    await expect(withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] })).rejects.toThrow("SlowDown");
    await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] });

    expect(pageStore.deletePage.mock.calls.map(([call]) => call.hostname)).toEqual([
      FALLBACK.domain,
      CUSTOM.domain,
      FALLBACK.domain,
      CUSTOM.domain,
    ]);
  });

  it("never lists the tenants when every hostname has its own tenant", async () => {
    const { withdrawal, tenantRepository } = buildWithdrawal();

    await withdrawal.withdraw({ siteId: "site-1", domains: [CUSTOM] });

    expect(tenantRepository.listTenantsForDistribution).not.toHaveBeenCalled();
    expect(tenantRepository.createInvalidation).toHaveBeenCalledTimes(1);
  });

  it("still invalidates the custom domain when the tenant listing fails, lists once, and reports each fallback", async () => {
    const { withdrawal, tenantRepository } = buildWithdrawal();
    tenantRepository.listTenantsForDistribution.mockRejectedValue(new Error("Throttling"));
    const secondFallback = { ...FALLBACK, domain: "other-site-2.direct.domits.com" };

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, secondFallback, CUSTOM] });

    expect(tenantRepository.listTenantsForDistribution).toHaveBeenCalledTimes(1);
    expect(tenantRepository.createInvalidation.mock.calls.map(([call]) => call.tenantId)).toEqual(["dt_custom"]);
    expect(result.invalidationErrors).toEqual([
      { hostname: FALLBACK.domain, message: "Throttling" },
      { hostname: secondFallback.domain, message: "Throttling" },
    ]);
  });

  it("reports a hostname no tenant serves and a failed invalidation instead of failing the withdrawal", async () => {
    const { withdrawal, tenantRepository } = buildWithdrawal({ tenants: [] });
    tenantRepository.createInvalidation.mockRejectedValueOnce(new Error("TooManyInvalidationsInProgress"));

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] });

    expect(result.hostnames).toEqual([FALLBACK.domain, CUSTOM.domain]);
    expect(result.invalidationErrors).toEqual([
      { hostname: FALLBACK.domain, message: "no tenant serves this hostname" },
      { tenantId: "dt_custom", message: "TooManyInvalidationsInProgress" },
    ]);
  });

  it("skips the tenant listing when no distribution is configured, and says so per hostname", async () => {
    const { withdrawal, tenantRepository } = buildWithdrawal({ distributionId: "", tenantByDomain: {} });

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

  it("removes a batch, skipping kept and changed pages, carrying on past a key that fails, invalidating once per tenant", async () => {
    const { withdrawal, pageStore, tenantRepository } = buildWithdrawal();
    const other = "other-site-2.direct.domits.com";
    const third = "third-site-3.direct.domits.com";
    const fourth = "fourth-site-4.direct.domits.com";
    pageStore.deletePage.mockImplementation(async ({ hostname, etag }) => {
      if (hostname === other) {
        throw new Error("SlowDown");
      }
      return !(hostname === fourth && etag === '"old"');
    });

    const result = await withdrawal.removePages([FALLBACK.domain, other, third, fourth, CUSTOM.domain, "Bad Host"], {
      keep: async (hostname) => hostname === CUSTOM.domain,
      etags: { [fourth]: '"old"' },
    });

    expect(pageStore.deletePage).toHaveBeenCalledWith({ hostname: fourth, etag: '"old"' });
    expect(result.removed).toEqual([FALLBACK.domain, third]);
    expect(result.kept).toEqual([fourth, CUSTOM.domain]);
    expect(result.failures).toEqual([
      { hostname: other, message: "SlowDown" },
      { hostname: "Bad Host", message: "A static page key needs a lowercase hostname." },
    ]);
    expect(tenantRepository.createInvalidation.mock.calls.map(([call]) => [call.tenantId, call.paths.length])).toEqual([
      ["dt_wildcard", 4],
    ]);
    expect(result.invalidationErrors).toEqual([]);
  });
});
