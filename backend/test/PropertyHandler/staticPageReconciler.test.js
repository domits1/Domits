import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { StaticPageReconciler } from "../../functions/PropertyHandler/business/service/staticPageReconciler.js";

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

const buildReconciler = ({ stored = [], rejected = [], entries = [], rows = [], now = null } = {}) => {
  const deps = {
    pageStore: { listPageHostnames: jest.fn(async () => ({ hostnames: stored, rejected })) },
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
      expect.any(Object)
    );
    expect(summary).toMatchObject({ removed: 3, queued: 0 });
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

  it("treats a disabled fallback domain of a published site as active, like the public page and the worker do", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({
      stored: ["a.direct.domits.com"],
      entries: [
        entry("a.direct.domits.com", PUBLISHED, { status: "DISABLED", verificationDetails: { disabledByHost: true } }),
      ],
      rows: [row("site-1", "ACTIVE")],
    });

    await reconciler.run();

    expect(withdrawal.removePages).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
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

  it("caps the work per run at 200, and falls back to 50 for a limit that is not a positive number", async () => {
    const stored = Array.from({ length: 250 }, (_, index) => `x${index}.direct.domits.com`);
    const { reconciler, withdrawal } = buildReconciler({ stored });

    await reconciler.run({ limit: 9999 });
    await reconciler.run({ limit: "many" });

    expect(withdrawal.removePages.mock.calls.map(([hostnames]) => hostnames.length)).toEqual([200, 50]);
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
