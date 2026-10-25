import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { StaticPageReconciler } from "../../functions/PropertyHandler/business/service/staticPageReconciler.js";
import { StaticPageRedirects } from "../../functions/PropertyHandler/business/service/staticPageRedirects.js";
import { StaticPageRedirectStore } from "../../functions/PropertyHandler/data/repository/staticPageRedirectStore.js";
import { buildFakeKeyValueStoreClient } from "./fakeKeyValueStoreClient.js";

const PUBLISHED = { id: "site-1", status: "PUBLISHED", staticPageRevision: 4 };
const UNPUBLISHED = { id: "site-2", status: "PREVIEW", staticPageRevision: 2 };

const entry = (domain, site, overrides = {}) => ({
  siteId: site.id,
  domain,
  domainType: domain.endsWith(".direct.domits.com") ? "FALLBACK" : "CUSTOM",
  status: "ACTIVE",
  isPrimary: true,
  verificationDetails: {},
  site,
  ...overrides,
});

const NOW = 1_790_000_000_000;
const row = (siteId, status, attemptCount = 0, updatedAt = NOW) => ({
  siteId,
  status,
  attemptCount,
  updatedAt,
  failureReason: "",
});

const buildReconciler = ({ stored = [], rejected = [], entries = [], rows = [], now = null, redirects } = {}) => {
  const deps = {
    pageStore: { listPageHostnames: jest.fn(async () => ({ hostnames: stored, etags: { x: '"e"' }, rejected })) },
    siteRepository: { queueStaticPage: jest.fn(async () => true) },
    domainRepository: {
      listDomainsWithSites: jest.fn(async () => entries),
      getDomainWithSiteByName: jest.fn(
        async (domain) => (now || entries).find((candidate) => candidate.domain === domain) || null
      ),
    },
    outboxRepository: {
      listPagesBySiteIds: jest.fn(async (siteIds) => rows.filter((candidate) => siteIds.includes(candidate.siteId))),
    },
    withdrawal: {
      removePages: jest.fn(async (hostnames, { keep }) => {
        const removed = [];
        const kept = [];
        for (const hostname of hostnames) {
          ((await keep(hostname)) ? kept : removed).push(hostname);
        }
        return { removed, kept, failures: [], invalidationErrors: [] };
      }),
    },
    redirects,
  };
  const run = (options = {}) => deps.reconciler.run({ now: NOW, ...options });
  deps.reconciler = new StaticPageReconciler(deps);
  return { ...deps, reconciler: { run } };
};

describe("StaticPageReconciler", () => {
  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
  });

  it("changes nothing when every published site has its page and no page is without a site", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({
      stored: ["a.direct.domits.com"],
      entries: [entry("a.direct.domits.com", PUBLISHED)],
      rows: [row("site-1", "ACTIVE")],
    });

    const summary = await reconciler.run();

    expect(withdrawal.removePages).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary).toEqual({ stored: 1, expected: 1, removed: 0, queued: 0, stuck: [], errors: [] });
  });

  it("removes, in one batch, the pages of an unpublished site, of a domain no site owns, and of a domain that is not active", async () => {
    const { reconciler, withdrawal } = buildReconciler({
      stored: ["a.direct.domits.com", "b.direct.domits.com", "gone.direct.domits.com", "www.pending.nl"],
      entries: [
        entry("a.direct.domits.com", PUBLISHED),
        entry("b.direct.domits.com", UNPUBLISHED),
        entry("www.pending.nl", PUBLISHED, { status: "PENDING" }),
      ],
      rows: [row("site-1", "ACTIVE")],
    });

    const summary = await reconciler.run();

    expect(withdrawal.removePages).toHaveBeenCalledTimes(1);
    expect(withdrawal.removePages).toHaveBeenCalledWith(
      ["b.direct.domits.com", "gone.direct.domits.com", "www.pending.nl"],
      expect.objectContaining({ etags: { x: '"e"' } })
    );
    expect(summary).toMatchObject({ removed: 3, queued: 0 });
  });

  it("removes nothing and reports it when the database lists no website domain while pages are stored", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({ stored: ["a.direct.domits.com", "www.b.nl"] });

    const summary = await reconciler.run();

    expect(withdrawal.removePages).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary.errors).toEqual([
      { message: "The database lists no website domain while 2 pages are stored; nothing was removed." },
    ]);
  });

  it("looks at each orphan again right before its own delete, so a site republished while earlier orphans go keeps its page", async () => {
    const { reconciler, domainRepository, withdrawal } = buildReconciler({
      stored: ["a.direct.domits.com", "b.direct.domits.com"],
      entries: [entry("b.direct.domits.com", UNPUBLISHED)],
    });
    domainRepository.getDomainWithSiteByName.mockImplementation(async (domain) => {
      if (domain === "a.direct.domits.com") {
        domainRepository.getDomainWithSiteByName.mockResolvedValueOnce(
          entry("b.direct.domits.com", { ...UNPUBLISHED, status: "PUBLISHED" })
        );
      }
      return null;
    });

    const summary = await reconciler.run();

    expect(withdrawal.removePages).toHaveBeenCalledWith(
      ["a.direct.domits.com", "b.direct.domits.com"],
      expect.any(Object)
    );
    expect(summary).toMatchObject({ removed: 1 });
  });

  it("queues a site again in the same run when a republish slipped between the last look and the delete", async () => {
    const republished = entry("b.direct.domits.com", { ...UNPUBLISHED, status: "PUBLISHED", staticPageRevision: 3 });
    const { reconciler, domainRepository, siteRepository } = buildReconciler({
      stored: ["b.direct.domits.com"],
      entries: [entry("b.direct.domits.com", UNPUBLISHED)],
      rows: [row("site-2", "BUILDING", 1)],
    });
    domainRepository.getDomainWithSiteByName.mockResolvedValueOnce(null).mockResolvedValueOnce(republished);

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage).toHaveBeenCalledWith("site-2", { evenWhileBusy: true });
    expect(summary).toMatchObject({ removed: 1, queued: 1 });

    domainRepository.getDomainWithSiteByName.mockResolvedValueOnce(null).mockResolvedValueOnce(republished);
    siteRepository.queueStaticPage.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "40001" }));
    expect((await reconciler.run()).errors).toEqual([{ siteId: "site-2", message: "conflict" }]);
  });

  it("queues a published site whose page is missing once however many domains it has, also when its row says active or withdrawn", async () => {
    const { reconciler, siteRepository } = buildReconciler({
      rejected: ["sites/by-host/UPPER.example/index.html"],
      entries: [
        entry("a.direct.domits.com", PUBLISHED),
        entry("www.a.nl", PUBLISHED),
        entry("c.direct.domits.com", { ...PUBLISHED, id: "site-3" }),
      ],
      rows: [row("site-1", "ACTIVE", 5), row("site-3", "WITHDRAWN")],
    });

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage.mock.calls.map(([siteId]) => siteId)).toEqual(["site-1", "site-3"]);
    expect(summary).toMatchObject({
      expected: 3,
      queued: 2,
      errors: [{ key: "sites/by-host/UPPER.example/index.html", message: "not a page key" }],
    });
  });

  it.each([
    ["is queued", row("site-1", "PENDING")],
    ["is being built", row("site-1", "BUILDING", 1)],
    ["is in its fifth build with a live lease", row("site-1", "BUILDING", 5)],
    ["failed and will be retried", row("site-1", "FAILED", 2)],
  ])("leaves a site alone whose row %s, instead of resetting its attempts", async (_label, existing) => {
    const { reconciler, siteRepository } = buildReconciler({
      entries: [entry("a.direct.domits.com", PUBLISHED)],
      rows: [existing],
    });

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ queued: 0, stuck: [] });
  });

  it.each([
    ["failed five times", { ...row("site-1", "FAILED", 5), failureReason: "RENDER_FAILED: no heading" }],
    ["died in its fifth build and its lease ran out", row("site-1", "BUILDING", 5, NOW - 16 * 60 * 1000)],
  ])("reports a site that %s instead of queueing it again every hour", async (_label, exhausted) => {
    const { reconciler, siteRepository } = buildReconciler({
      entries: [entry("a.direct.domits.com", PUBLISHED)],
      rows: [exhausted],
    });

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary.stuck).toEqual([
      { siteId: "site-1", status: exhausted.status, failureReason: exhausted.failureReason },
    ]);
  });

  it("spends the budget on sites it can queue, so stuck and busy sites never starve the ones behind them", async () => {
    const entries = ["s1", "s2", "s3", "s4"].map((id) => entry(`${id}.direct.domits.com`, { ...PUBLISHED, id }));
    const { reconciler, siteRepository } = buildReconciler({
      entries,
      rows: [row("s1", "FAILED", 5), row("s2", "BUILDING", 1)],
    });

    const summary = await reconciler.run({ limit: 1 });

    expect(siteRepository.queueStaticPage.mock.calls.map(([siteId]) => siteId)).toEqual(["s3"]);
    expect(summary).toMatchObject({ queued: 1, stuck: [expect.objectContaining({ siteId: "s1" })] });
  });

  it("carries on after a removal or a queue that fails, reports each, and stays quiet about a queue another reconciler won", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({
      stored: ["gone1.direct.domits.com", "gone2.direct.domits.com"],
      entries: [entry("a.direct.domits.com", PUBLISHED), entry("b.direct.domits.com", { ...PUBLISHED, id: "site-2" })],
    });
    withdrawal.removePages.mockResolvedValueOnce({
      removed: ["gone2.direct.domits.com"],
      failures: [{ hostname: "gone1.direct.domits.com", message: "AccessDenied" }],
      invalidationErrors: [{ hostname: "gone2.direct.domits.com", message: "no tenant serves this hostname" }],
    });
    siteRepository.queueStaticPage
      .mockRejectedValueOnce(new Error("connection lost"))
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "40001" }));

    const summary = await reconciler.run();

    expect(summary).toMatchObject({
      removed: 1,
      queued: 0,
      errors: [
        { hostname: "gone1.direct.domits.com", message: "AccessDenied" },
        { hostname: "gone2.direct.domits.com", message: "no tenant serves this hostname" },
        { siteId: "site-1", message: "connection lost" },
      ],
    });
  });
});

describe("repairing the redirects of every site", () => {
  const ALIAS = "beautiful-home-amsterdam-6156b005.direct.domits.com";
  const PRIMARY = "www.villasensual.nl";
  const SITE_ENTRIES = [entry(ALIAS, PUBLISHED, { isPrimary: false }), entry(PRIMARY, PUBLISHED)];
  const reconcileWith = ({ keys = {}, entries = SITE_ENTRIES } = {}) => {
    const log = [];
    const client = buildFakeKeyValueStoreClient({ keys, log });
    const store = new StaticPageRedirectStore({ kvsArn: "arn:aws:cloudfront::1:key-value-store/redirects", client });
    const redirects = new StaticPageRedirects({ store });
    const stored = entries.map((candidate) => candidate.domain);
    const built = buildReconciler({ stored, entries, rows: [row("site-1", "ACTIVE")], redirects });
    built.domainRepository.listDomainsWithSites.mockImplementation(async () => log.push("db:list") && entries);
    return { log, client, ...built };
  };

  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
  });

  it("repairs missing and stale redirects, after reading the version of the store first", async () => {
    const { reconciler, client, log } = reconcileWith({
      keys: { "gone.direct.domits.com": "www.gone.nl", [ALIAS]: "www.old-primary.nl" },
    });

    const summary = await reconciler.run();

    expect(Object.fromEntries(client.state.keys)).toEqual({ [ALIAS]: PRIMARY });
    expect(summary.redirects).toEqual({ put: 1, deleted: 1 });
    expect(summary.errors).toEqual([]);
    expect(log.indexOf("kvs:DescribeKeyValueStoreCommand")).toBeLessThan(log.indexOf("db:list"));
  });

  it("skips the round, without an error, when someone else writes the store during the run", async () => {
    const { reconciler, client } = reconcileWith();
    client.writeBeforeNextUpdate();

    const summary = await reconciler.run();

    expect(summary.redirects).toEqual({ put: 0, deleted: 0, conflict: true });
    expect(summary.errors).toEqual([]);
    expect(client.state.keys.has(ALIAS)).toBe(false);
  });

  it("never empties the store when the database lists no domain at all", async () => {
    const { reconciler, client } = reconcileWith({ keys: { [ALIAS]: PRIMARY }, entries: [] });

    await reconciler.run();

    expect(client.state.keys.get(ALIAS)).toBe(PRIMARY);
  });

  it("only reads the version of the store when no redirect is expected and none is stored", async () => {
    const { reconciler, client } = reconcileWith({ entries: [entry("a.direct.domits.com", PUBLISHED)] });

    await reconciler.run();

    expect(client.calls.map((call) => call.name)).toEqual(["DescribeKeyValueStoreCommand"]);
  });

  it("reports a store it cannot read, and still repairs the pages", async () => {
    const { reconciler, client, siteRepository } = reconcileWith();
    client.failNextCall(new Error("store unavailable"));

    const summary = await reconciler.run();

    expect(summary.errors).toEqual([{ message: "REDIRECT_RECONCILE_FAILED: store unavailable" }]);
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
  });
});
