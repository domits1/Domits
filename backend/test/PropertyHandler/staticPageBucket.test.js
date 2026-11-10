import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { StaticPageStore } from "../../functions/PropertyHandler/data/repository/staticPageStore.js";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";
import { StaticPageWorker } from "../../functions/PropertyHandler/business/service/staticPageWorker.js";
import { StaticPageReconciler } from "../../functions/PropertyHandler/business/service/staticPageReconciler.js";
import { buildFakeSitesBucketClient } from "./fakeSitesBucketClient.js";

const SHELL = '<html><head></head><body><div id="root"></div></body></html>';
const PAGE = "<html>rendered</html>";
const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
const listing = (url) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc></url>\n</urlset>\n`;
const FALLBACK = "cliff-house-site-1.direct.domits.com";
const CUSTOM = "www.cliffhouse.nl";
const OTHER = "other-site-2.direct.domits.com";
const GONE = "gone-site-9.direct.domits.com";
const pageKey = (hostname) => `sites/by-host/${hostname}/index.html`;
const sitemapKey = (hostname) => `sites/by-host/${hostname}/sitemap.xml`;
const withdrawnPaths = (hostname) => [
  `/${pageKey(hostname)}`,
  "/",
  "/index.html",
  `/${sitemapKey(hostname)}`,
  "/sitemap.xml",
];
const pageOf = (hostname) => ({ [pageKey(hostname)]: `<html>${hostname}</html>`, [sitemapKey(hostname)]: EMPTY_SITEMAP });

const buildTenants = () => ({
  listTenantsForDistribution: jest.fn(async () => [{ id: "dt_wildcard", domains: ["*.direct.domits.com"] }]),
  getTenantByDomain: jest.fn(async (domain) => (domain === CUSTOM ? { id: "dt_custom" } : null)),
  createInvalidation: jest.fn(async () => "I1"),
});

const invalidations = (tenantRepository) =>
  tenantRepository.createInvalidation.mock.calls.map(([call]) => [call.tenantId, call.paths]);

const buildBucket = (objects, options) => {
  const client = buildFakeSitesBucketClient({ objects, ...options });
  const tenantRepository = buildTenants();
  const pageStore = new StaticPageStore({ client });
  const withdrawal = new StaticPageWithdrawal({ pageStore, tenantRepository, distributionId: "E18DIST" });
  return { client, tenantRepository, pageStore, withdrawal };
};

const buildOutbox = (row) => {
  const finish = (status) => async (_siteId, revision) => {
    if (row.revision !== revision || row.status !== "BUILDING") {
      return false;
    }
    row.status = status;
    return true;
  };
  return {
    row,
    listPagesToBuild: async () => (row.status === "PENDING" ? [{ ...row }] : []),
    claimPage: async () => {
      Object.assign(row, { status: "BUILDING", attemptCount: row.attemptCount + 1 });
      return true;
    },
    markPageActive: finish("ACTIVE"),
    markPageFailed: finish("FAILED"),
    markPageWithdrawn: finish("WITHDRAWN"),
    skipPage: finish("SKIPPED"),
    requeueNewerRevision: async () => false,
  };
};

const domainEntry = (domain, site, overrides = {}) => ({
  siteId: site.id,
  domain,
  domainType: domain.endsWith(".direct.domits.com") ? "FALLBACK" : "CUSTOM",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: {},
  site,
  ...overrides,
});

const buildReconciler = (bucket, entries) => {
  const siteRepository = { queueStaticPage: jest.fn(async () => true) };
  const reconciler = new StaticPageReconciler({
    pageStore: bucket.pageStore,
    withdrawal: bucket.withdrawal,
    siteRepository,
    domainRepository: {
      listDomainsWithSites: async () => entries,
      getDomainWithSiteByName: async (domain) => entries.find((entry) => entry.domain === domain) || null,
    },
    outboxRepository: { listPagesBySiteIds: async () => [] },
  });
  return { reconciler, siteRepository };
};

describe("the static page jobs on one bucket", () => {
  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
    jest.restoreAllMocks();
  });

  it("withdraws a site by deleting its page and emptying its sitemap on every host, and touches no other site", async () => {
    const { client, tenantRepository, withdrawal } = buildBucket({
      "index.html": SHELL,
      ...pageOf(FALLBACK),
      [sitemapKey(CUSTOM)]: listing(`https://${CUSTOM}/`),
      [pageKey(CUSTOM)]: "<html>custom</html>",
      ...pageOf(OTHER),
    });

    const result = await withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }, { domain: CUSTOM }] });

    expect(client.writes()).toEqual([
      `delete ${pageKey(FALLBACK)}`,
      `put ${sitemapKey(FALLBACK)}`,
      `delete ${pageKey(CUSTOM)}`,
      `put ${sitemapKey(CUSTOM)}`,
    ]);
    expect(client.objects()).toEqual({
      "index.html": SHELL,
      [sitemapKey(FALLBACK)]: EMPTY_SITEMAP,
      [sitemapKey(CUSTOM)]: EMPTY_SITEMAP,
      ...pageOf(OTHER),
    });
    expect(result).toEqual({
      siteId: "site-1",
      hostnames: [FALLBACK, CUSTOM],
      invalidationErrors: [],
      redirectErrors: [],
    });
    expect(invalidations(tenantRepository)).toEqual([
      ["dt_wildcard", withdrawnPaths(FALLBACK)],
      ["dt_custom", withdrawnPaths(CUSTOM)],
    ]);
  });

  it("builds a published site on every active host, then withdraws it when it is unpublished", async () => {
    const bucket = buildBucket({ "index.html": SHELL, ...pageOf(OTHER) });
    const site = { id: "site-1", status: "PUBLISHED", staticPageRevision: 4 };
    const outbox = buildOutbox({ siteId: "site-1", revision: 4, status: "PENDING", attemptCount: 0 });
    const worker = new StaticPageWorker({
      outboxRepository: outbox,
      siteRepository: { getSiteById: async () => site },
      domainRepository: {
        listDomainsBySiteId: async () => [
          { domain: FALLBACK, domainType: "FALLBACK", status: "ACTIVE", isPrimary: false },
          { domain: CUSTOM, domainType: "CUSTOM", status: "ACTIVE", isPrimary: true },
        ],
      },
      pageStore: bucket.pageStore,
      renderer: { render: async () => PAGE },
      withdrawal: bucket.withdrawal,
    });

    const built = await worker.run();

    expect(built).toMatchObject({ listed: 1, built: 1, failed: 0, errors: [] });
    expect(bucket.client.writes()).toEqual([
      `put ${sitemapKey(FALLBACK)}`,
      `put ${pageKey(FALLBACK)}`,
      `put ${pageKey(CUSTOM)}`,
      `put ${sitemapKey(CUSTOM)}`,
    ]);

    Object.assign(site, { status: "PREVIEW", staticPageRevision: 5 });
    Object.assign(outbox.row, { revision: 5, status: "PENDING", attemptCount: 0 });
    const withdrawn = await worker.run();

    expect(withdrawn).toMatchObject({ listed: 1, withdrawn: 1, failed: 0, errors: [] });
    expect(outbox.row.status).toBe("WITHDRAWN");
    expect(bucket.client.writes().slice(4)).toEqual([
      `delete ${pageKey(FALLBACK)}`,
      `put ${sitemapKey(FALLBACK)}`,
      `delete ${pageKey(CUSTOM)}`,
      `put ${sitemapKey(CUSTOM)}`,
    ]);
    expect(bucket.client.objects()).toEqual({
      "index.html": SHELL,
      [sitemapKey(FALLBACK)]: EMPTY_SITEMAP,
      [sitemapKey(CUSTOM)]: EMPTY_SITEMAP,
      ...pageOf(OTHER),
    });
  });

  it("removes the page no published site serves, queues the site that has none, and reports a stray key", async () => {
    const stray = `sites/by-host/${OTHER}/old.html`;
    const bucket = buildBucket(
      { "index.html": SHELL, ...pageOf(OTHER), ...pageOf(GONE), [stray]: "<html>old</html>" },
      { pageSize: 2 }
    );
    const published = { id: "site-2", status: "PUBLISHED" };
    const missing = { id: "site-3", status: "PUBLISHED" };
    const { reconciler, siteRepository } = buildReconciler(bucket, [
      domainEntry(OTHER, published),
      domainEntry(CUSTOM, missing),
    ]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toEqual({
      stored: 2,
      expected: 2,
      removed: 1,
      queued: 1,
      stuck: [],
      errors: [{ key: stray, message: "not a page key" }],
    });
    expect(bucket.client.writes()).toEqual([`delete ${pageKey(GONE)}`, `put ${sitemapKey(GONE)}`]);
    expect(bucket.client.calls.find((call) => call.key === pageKey(GONE)).ifMatch).toMatch(/^"v\d+"$/);
    expect(bucket.client.objects()).toEqual({
      "index.html": SHELL,
      ...pageOf(OTHER),
      [sitemapKey(GONE)]: EMPTY_SITEMAP,
      [stray]: "<html>old</html>",
    });
    expect(siteRepository.queueStaticPage).toHaveBeenCalledWith("site-3", { evenWhileBusy: false });
    expect(invalidations(bucket.tenantRepository)).toEqual([["dt_wildcard", withdrawnPaths(GONE)]]);
  });

  it("keeps a page that a build rewrote between the listing and the delete", async () => {
    const bucket = buildBucket({ "index.html": SHELL, ...pageOf(OTHER), ...pageOf(GONE) });
    bucket.client.beforeNext("DeleteObjectCommand", pageKey(GONE), () =>
      bucket.client.put(pageKey(GONE), "<html>rebuilt</html>")
    );
    const { reconciler } = buildReconciler(bucket, [domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" })]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toMatchObject({ removed: 0, errors: [] });
    expect(bucket.client.writes()).toEqual([`delete ${pageKey(GONE)}`]);
    expect(bucket.client.objects()[pageKey(GONE)]).toBe("<html>rebuilt</html>");
    expect(bucket.tenantRepository.createInvalidation).not.toHaveBeenCalled();
  });
});
