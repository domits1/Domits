import { describe, it, expect, jest } from "@jest/globals";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";
import { StaticPageStore } from "../../functions/PropertyHandler/data/repository/staticPageStore.js";

const FALLBACK = { domain: "cliff-house-site-1.direct.domits.com", domainType: "FALLBACK", status: "DISABLED" };
const CUSTOM = { domain: "www.cliffhouse.nl", domainType: "CUSTOM", status: "ACTIVE" };
const WILDCARD_TENANT = { id: "dt_wildcard", domains: ["*.direct.domits.com", "developers.domits.com"] };
const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
const withdrawnPaths = (hostname) => [
  `/sites/by-host/${hostname}/index.html`,
  "/",
  "/index.html",
  `/sites/by-host/${hostname}/sitemap.xml`,
  "/sitemap.xml",
];

const buildWithdrawal = ({
  tenants = [WILDCARD_TENANT],
  tenantByDomain = { [CUSTOM.domain]: { id: "dt_custom" } },
  domains = [FALLBACK, CUSTOM],
  distributionId = "E18DIST",
} = {}) => {
  const pageStore = { deletePage: jest.fn(async () => undefined), putSitemap: jest.fn(async () => undefined) };
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
      ["dt_wildcard", withdrawnPaths(FALLBACK.domain)],
      ["dt_custom", withdrawnPaths(CUSTOM.domain)],
    ]);
    expect(result).toEqual({ siteId: "site-1", hostnames: [FALLBACK.domain, CUSTOM.domain], invalidationErrors: [] });
  });

  it("replaces the sitemap of every host with an empty one right after its page, so it lists nothing and stays valid", async () => {
    const { withdrawal, pageStore } = buildWithdrawal();
    const order = [];
    pageStore.deletePage.mockImplementation(async ({ hostname }) => order.push(`delete ${hostname}`));
    pageStore.putSitemap.mockImplementation(async ({ hostname }) => order.push(`sitemap ${hostname}`));

    await withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] });

    expect(order).toEqual([
      `delete ${FALLBACK.domain}`,
      `sitemap ${FALLBACK.domain}`,
      `delete ${CUSTOM.domain}`,
      `sitemap ${CUSTOM.domain}`,
    ]);
    expect(pageStore.putSitemap.mock.calls.map(([call]) => call)).toEqual([
      { hostname: FALLBACK.domain, xml: EMPTY_SITEMAP, siteId: "site-1" },
      { hostname: CUSTOM.domain, xml: EMPTY_SITEMAP, siteId: "site-1" },
    ]);
  });

  it("stops at a sitemap write that fails and invalidates nothing, so the retry empties it again", async () => {
    const { withdrawal, pageStore, tenantRepository } = buildWithdrawal();
    pageStore.putSitemap.mockRejectedValueOnce(new Error("SlowDown"));

    await expect(withdrawal.withdraw({ siteId: "site-1", domains: [FALLBACK, CUSTOM] })).rejects.toThrow("SlowDown");

    expect(pageStore.deletePage).toHaveBeenCalledTimes(1);
    expect(tenantRepository.createInvalidation).not.toHaveBeenCalled();
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
      ["dt_wildcard", 7],
    ]);
    expect(result.invalidationErrors).toEqual([]);
  });

  it("empties the sitemap of each page it removes, reports a sitemap it cannot write only as a failure, and still invalidates that deleted page", async () => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    const sent = [];
    const client = {
      send: jest.fn(async (command) => {
        sent.push([command.constructor.name, command.input.Key, command.input.Body]);
        if (command.input.Key === `sites/by-host/${CUSTOM.domain}/sitemap.xml`) {
          throw new Error("SlowDown");
        }
        return {};
      }),
    };
    const { tenantRepository } = buildWithdrawal();
    const pageStore = new StaticPageStore({ client });
    const withdrawal = new StaticPageWithdrawal({
      pageStore,
      tenantRepository,
      domainRepository: {},
      distributionId: "E18DIST",
    });

    const result = await withdrawal.removePages([FALLBACK.domain, CUSTOM.domain]);

    expect(sent).toEqual([
      ["DeleteObjectCommand", `sites/by-host/${FALLBACK.domain}/index.html`, undefined],
      ["PutObjectCommand", `sites/by-host/${FALLBACK.domain}/sitemap.xml`, EMPTY_SITEMAP],
      ["DeleteObjectCommand", `sites/by-host/${CUSTOM.domain}/index.html`, undefined],
      ["PutObjectCommand", `sites/by-host/${CUSTOM.domain}/sitemap.xml`, EMPTY_SITEMAP],
    ]);
    expect(result.removed).toEqual([FALLBACK.domain]);
    expect(result.failures).toEqual([{ hostname: CUSTOM.domain, message: "SlowDown" }]);
    expect(tenantRepository.createInvalidation.mock.calls.map(([call]) => [call.tenantId, call.paths])).toEqual([
      ["dt_wildcard", withdrawnPaths(FALLBACK.domain)],
      ["dt_custom", withdrawnPaths(CUSTOM.domain)],
    ]);
  });
});
