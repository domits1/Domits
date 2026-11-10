import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import {
  STATIC_SITE_PAGE_SLUGS,
  StaticPageStore,
  buildStaticSitePageKey,
} from "../../functions/PropertyHandler/data/repository/staticPageStore.js";
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
const HALF = "half-site-8.direct.domits.com";
const pageKey = (hostname) => `sites/by-host/${hostname}/index.html`;
const sitemapKey = (hostname) => `sites/by-host/${hostname}/sitemap.xml`;
const withdrawnPaths = (hostname) => [
  `/${pageKey(hostname)}`,
  "/",
  "/index.html",
  `/${sitemapKey(hostname)}`,
  "/sitemap.xml",
];
const pageOf = (hostname) => ({
  [pageKey(hostname)]: `<html>${hostname}</html>`,
  [sitemapKey(hostname)]: EMPTY_SITEMAP,
});

const sitePagesOf = (hostname, slugs) =>
  Object.fromEntries(slugs.map((slug) => [buildStaticSitePageKey(hostname, slug), `<html>${hostname} ${slug}</html>`]));

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

const buildReconciler = (bucket, entries, lookup = entries) => {
  const siteRepository = { queueStaticPage: jest.fn(async () => true) };
  const reconciler = new StaticPageReconciler({
    pageStore: bucket.pageStore,
    withdrawal: bucket.withdrawal,
    siteRepository,
    domainRepository: {
      listDomainsWithSites: async () => entries,
      getDomainWithSiteByName: async (domain) => lookup.find((entry) => entry.domain === domain) || null,
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

  it("withdraws the site pages of a host before its sitemap, and invalidates their paths with the page", async () => {
    const { client, tenantRepository, withdrawal } = buildBucket({
      "index.html": SHELL,
      ...pageOf(FALLBACK),
      ...sitePagesOf(FALLBACK, ["gallery", "contact-us"]),
      ...pageOf(CUSTOM),
      ...pageOf(OTHER),
      ...sitePagesOf(OTHER, STATIC_SITE_PAGE_SLUGS),
    });

    await withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }, { domain: CUSTOM }] });

    expect(client.writes()).toEqual([
      `delete ${pageKey(FALLBACK)}`,
      `delete ${buildStaticSitePageKey(FALLBACK, "contact-us")}`,
      `delete ${buildStaticSitePageKey(FALLBACK, "gallery")}`,
      `put ${sitemapKey(FALLBACK)}`,
      `delete ${pageKey(CUSTOM)}`,
      `put ${sitemapKey(CUSTOM)}`,
    ]);
    expect(client.objects()).toEqual({
      "index.html": SHELL,
      [sitemapKey(FALLBACK)]: EMPTY_SITEMAP,
      [sitemapKey(CUSTOM)]: EMPTY_SITEMAP,
      ...pageOf(OTHER),
      ...sitePagesOf(OTHER, STATIC_SITE_PAGE_SLUGS),
    });
    expect(invalidations(tenantRepository)).toEqual([
      [
        "dt_wildcard",
        [
          ...withdrawnPaths(FALLBACK),
          `/${buildStaticSitePageKey(FALLBACK, "contact-us")}`,
          "/contact-us",
          `/${buildStaticSitePageKey(FALLBACK, "gallery")}`,
          "/gallery",
        ],
      ],
      ["dt_custom", withdrawnPaths(CUSTOM)],
    ]);
  });

  it("changes nothing on a host whose site pages cannot be listed, and the retry withdraws them", async () => {
    const before = { "index.html": SHELL, ...pageOf(FALLBACK), ...sitePagesOf(FALLBACK, ["gallery"]) };
    const { client, tenantRepository, withdrawal } = buildBucket(before);
    client.failNext("ListObjectsV2Command", `sites/by-host/${FALLBACK}/pages/`, new Error("AccessDenied"));

    await expect(withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }] })).rejects.toThrow(
      "AccessDenied"
    );
    expect(client.objects()).toEqual(before);
    expect(tenantRepository.createInvalidation).not.toHaveBeenCalled();

    await withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }] });

    expect(client.objects()).toEqual({ "index.html": SHELL, [sitemapKey(FALLBACK)]: EMPTY_SITEMAP });
  });

  it("stops at a site page that cannot be deleted, invalidates nothing, and the retry removes what is left", async () => {
    const gallery = buildStaticSitePageKey(FALLBACK, "gallery");
    const { client, tenantRepository, withdrawal } = buildBucket({
      "index.html": SHELL,
      ...pageOf(FALLBACK),
      ...sitePagesOf(FALLBACK, ["gallery", "contact-us"]),
    });
    client.failNext("DeleteObjectCommand", gallery, new Error("SlowDown"));

    await expect(withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }] })).rejects.toThrow(
      "SlowDown"
    );
    expect(Object.keys(client.objects())).toEqual(["index.html", sitemapKey(FALLBACK), gallery]);
    expect(tenantRepository.createInvalidation).not.toHaveBeenCalled();

    await withdrawal.withdraw({ siteId: "site-1", domains: [{ domain: FALLBACK }] });

    expect(client.objects()).toEqual({ "index.html": SHELL, [sitemapKey(FALLBACK)]: EMPTY_SITEMAP });
    expect(invalidations(tenantRepository)).toEqual([
      ["dt_wildcard", [...withdrawnPaths(FALLBACK), `/${gallery}`, "/gallery"]],
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

  it("leaves the site pages of a published site alone and reports none of them, but still any other stray key", async () => {
    const stray = `sites/by-host/${OTHER}/pages/old.html`;
    const before = {
      "index.html": SHELL,
      ...pageOf(OTHER),
      ...sitePagesOf(OTHER, STATIC_SITE_PAGE_SLUGS),
      [stray]: "<html>old</html>",
    };
    const bucket = buildBucket(before, { pageSize: 2 });
    const { reconciler, siteRepository } = buildReconciler(bucket, [
      domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" }),
    ]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toEqual({
      stored: 1,
      expected: 1,
      removed: 0,
      queued: 0,
      stuck: [],
      errors: [{ key: stray, message: "not a page key" }],
    });
    expect(bucket.client.writes()).toEqual([]);
    expect(bucket.client.objects()).toEqual(before);
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
  });

  it("removes the site pages of every host no published site serves, also of a host with only site pages left", async () => {
    const bucket = buildBucket({
      "index.html": SHELL,
      ...pageOf(OTHER),
      ...sitePagesOf(OTHER, STATIC_SITE_PAGE_SLUGS),
      ...pageOf(GONE),
      ...sitePagesOf(GONE, ["gallery"]),
      [sitemapKey(HALF)]: EMPTY_SITEMAP,
      ...sitePagesOf(HALF, ["accommodation"]),
    });
    const { reconciler } = buildReconciler(bucket, [domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" })]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toEqual({ stored: 2, expected: 1, removed: 2, queued: 0, stuck: [], errors: [] });
    expect(bucket.client.writes()).toEqual([
      `delete ${pageKey(GONE)}`,
      `delete ${buildStaticSitePageKey(GONE, "gallery")}`,
      `put ${sitemapKey(GONE)}`,
      `delete ${pageKey(HALF)}`,
      `delete ${buildStaticSitePageKey(HALF, "accommodation")}`,
      `put ${sitemapKey(HALF)}`,
    ]);
    expect(
      bucket.client.calls.filter((call) => call.name === "DeleteObjectCommand").map((call) => Boolean(call.ifMatch))
    ).toEqual([true, true, false, true]);
    expect(bucket.client.objects()).toEqual({
      "index.html": SHELL,
      ...pageOf(OTHER),
      ...sitePagesOf(OTHER, STATIC_SITE_PAGE_SLUGS),
      [sitemapKey(GONE)]: EMPTY_SITEMAP,
      [sitemapKey(HALF)]: EMPTY_SITEMAP,
    });
    expect(invalidations(bucket.tenantRepository)).toEqual([
      [
        "dt_wildcard",
        [
          ...new Set([
            ...withdrawnPaths(GONE),
            `/${buildStaticSitePageKey(GONE, "gallery")}`,
            "/gallery",
            ...withdrawnPaths(HALF),
            `/${buildStaticSitePageKey(HALF, "accommodation")}`,
            "/accommodation",
          ]),
        ],
      ],
    ]);
  });

  it("keeps a site page that a build rewrote between the listing and its delete, and leaves it out of the invalidation", async () => {
    const gallery = buildStaticSitePageKey(GONE, "gallery");
    const bucket = buildBucket({
      "index.html": SHELL,
      ...pageOf(OTHER),
      ...pageOf(GONE),
      [gallery]: "<html>old</html>",
    });
    bucket.client.beforeNext("DeleteObjectCommand", gallery, () => bucket.client.put(gallery, "<html>rebuilt</html>"));
    const { reconciler } = buildReconciler(bucket, [domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" })]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toMatchObject({ removed: 1, errors: [] });
    expect(bucket.client.objects()[gallery]).toBe("<html>rebuilt</html>");
    expect(invalidations(bucket.tenantRepository)).toEqual([["dt_wildcard", withdrawnPaths(GONE)]]);
  });

  it("reports a site page it cannot delete, invalidates what it did delete, and finishes that host on the next run", async () => {
    const gallery = buildStaticSitePageKey(GONE, "gallery");
    const contact = buildStaticSitePageKey(GONE, "contact-us");
    const bucket = buildBucket({
      "index.html": SHELL,
      ...pageOf(GONE),
      ...sitePagesOf(GONE, ["gallery", "contact-us"]),
    });
    bucket.client.failNext("DeleteObjectCommand", gallery, new Error("SlowDown"));
    const { reconciler } = buildReconciler(bucket, [domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" })]);

    const first = await reconciler.run({ now: 1_790_000_000_000 });

    expect(first).toMatchObject({ removed: 0, errors: [{ hostname: GONE, message: "SlowDown" }] });
    expect(invalidations(bucket.tenantRepository)).toEqual([
      ["dt_wildcard", [...withdrawnPaths(GONE), `/${contact}`, "/contact-us"]],
    ]);

    const second = await reconciler.run({ now: 1_790_000_000_000 });

    expect(second).toMatchObject({ stored: 0, removed: 1, errors: [] });
    expect(bucket.client.objects()).toEqual({ "index.html": SHELL, [sitemapKey(GONE)]: EMPTY_SITEMAP });
  });

  it.each([
    ["a build rewrote its main page", true, []],
    ["it was published again", false, [domainEntry(GONE, { id: "site-9", status: "PUBLISHED" })]],
  ])("keeps every site page of a host when %s between the listing and the delete", async (_label, rewrite, lookup) => {
    const before = { "index.html": SHELL, ...pageOf(GONE), ...sitePagesOf(GONE, ["gallery"]) };
    const bucket = buildBucket(before);
    if (rewrite) {
      bucket.client.beforeNext("DeleteObjectCommand", pageKey(GONE), () => bucket.client.put(pageKey(GONE), "new"));
    }
    const { reconciler } = buildReconciler(bucket, [domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" })], lookup);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toMatchObject({ removed: 0, errors: [] });
    expect(bucket.client.writes()).toEqual(rewrite ? [`delete ${pageKey(GONE)}`] : []);
    expect(bucket.client.objects()[buildStaticSitePageKey(GONE, "gallery")]).toBe(
      before[buildStaticSitePageKey(GONE, "gallery")]
    );
  });

  it("queues a published site whose host has site pages but no main page, and leaves those pages alone", async () => {
    const before = { "index.html": SHELL, ...sitePagesOf(OTHER, ["gallery"]) };
    const bucket = buildBucket(before);
    const { reconciler, siteRepository } = buildReconciler(bucket, [
      domainEntry(OTHER, { id: "site-2", status: "PUBLISHED" }),
    ]);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary).toEqual({ stored: 0, expected: 1, removed: 0, queued: 1, stuck: [], errors: [] });
    expect(siteRepository.queueStaticPage).toHaveBeenCalledWith("site-2", { evenWhileBusy: false });
    expect(bucket.client.objects()).toEqual(before);
  });

  it("removes nothing when the database lists no website domain while only site pages are stored", async () => {
    const before = { "index.html": SHELL, ...sitePagesOf(HALF, ["gallery"]) };
    const bucket = buildBucket(before);
    const { reconciler } = buildReconciler(bucket, []);

    const summary = await reconciler.run({ now: 1_790_000_000_000 });

    expect(summary.errors).toEqual([
      { message: "The database lists no website domain while 1 pages are stored; nothing was removed." },
    ]);
    expect(bucket.client.objects()).toEqual(before);
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
