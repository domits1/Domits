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

const row = (siteId, status, attemptCount = 0) => ({ siteId, status, attemptCount, failureReason: "" });

const buildReconciler = ({ stored = [], rejected = [], entries = [], rows = [], now = null } = {}) => {
  const calls = [];
  const deps = {
    pageStore: { listPageHostnames: jest.fn(async () => (calls.push("list"), { hostnames: stored, rejected })) },
    siteRepository: { queueStaticPage: jest.fn(async () => true) },
    domainRepository: {
      listDomainsWithSites: jest.fn(async () => (calls.push("sql"), entries)),
      getDomainWithSiteByName: jest.fn(
        async (domain) => (now || entries).find((candidate) => candidate.domain === domain) || null
      ),
    },
    outboxRepository: {
      listPagesBySiteIds: jest.fn(async (siteIds) => rows.filter((candidate) => siteIds.includes(candidate.siteId))),
    },
    withdrawal: {
      removePages: jest.fn(async (hostnames) => ({ removed: hostnames, failures: [], invalidationErrors: [] })),
    },
  };
  return { reconciler: new StaticPageReconciler(deps), calls, ...deps };
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
    expect(withdrawal.removePages).toHaveBeenCalledWith([
      "b.direct.domits.com",
      "gone.direct.domits.com",
      "www.pending.nl",
    ]);
    expect(summary).toMatchObject({ removed: 3, queued: 0 });
  });

  it("looks at each orphan again right before removing it, and keeps a page its site republished in the meantime", async () => {
    const republished = entry("b.direct.domits.com", { ...UNPUBLISHED, status: "PUBLISHED", staticPageRevision: 3 });
    const { reconciler, withdrawal, domainRepository } = buildReconciler({
      stored: ["b.direct.domits.com", "gone.direct.domits.com"],
      entries: [entry("b.direct.domits.com", UNPUBLISHED)],
      now: [republished],
    });

    const summary = await reconciler.run();

    expect(domainRepository.getDomainWithSiteByName.mock.calls.map(([domain]) => domain)).toEqual([
      "b.direct.domits.com",
      "gone.direct.domits.com",
    ]);
    expect(withdrawal.removePages).toHaveBeenCalledWith(["gone.direct.domits.com"]);
    expect(summary).toMatchObject({ removed: 1 });
  });

  it("lists the bucket before reading the sites, so a page written during the run is never taken for an orphan", async () => {
    const { reconciler, calls } = buildReconciler();

    await reconciler.run();

    expect(calls).toEqual(["list", "sql"]);
  });

  it("reports a listed key that is not a page key without touching it", async () => {
    const { reconciler, withdrawal } = buildReconciler({ rejected: ["sites/by-host/UPPER.example/index.html"] });

    const summary = await reconciler.run();

    expect(withdrawal.removePages).not.toHaveBeenCalled();
    expect(summary.errors).toEqual([{ key: "sites/by-host/UPPER.example/index.html", message: "not a page key" }]);
  });

  it("queues a published site whose page is missing, once per site however many domains it has", async () => {
    const { reconciler, siteRepository } = buildReconciler({
      entries: [entry("a.direct.domits.com", PUBLISHED), entry("www.a.nl", PUBLISHED)],
    });

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage).toHaveBeenCalledTimes(1);
    expect(siteRepository.queueStaticPage).toHaveBeenCalledWith("site-1");
    expect(summary).toMatchObject({ expected: 2, queued: 1 });
  });

  it.each([
    ["is queued", row("site-1", "PENDING")],
    ["is being built", row("site-1", "BUILDING", 1)],
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
    ["died in its fifth build", row("site-1", "BUILDING", 5)],
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

  it("queues a site whose row says the page is active or withdrawn while the page is gone", async () => {
    const { reconciler, siteRepository } = buildReconciler({
      entries: [entry("a.direct.domits.com", PUBLISHED), entry("c.direct.domits.com", { ...PUBLISHED, id: "site-3" })],
      rows: [row("site-1", "ACTIVE"), row("site-3", "WITHDRAWN")],
    });

    await reconciler.run();

    expect(siteRepository.queueStaticPage.mock.calls.map(([siteId]) => siteId)).toEqual(["site-1", "site-3"]);
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

  it.each([
    ["a negative limit", -1],
    ["a limit that is not a number", "many"],
    ["a limit above the maximum", 9999],
  ])("caps the work per run even with %s", async (_label, limit) => {
    const stored = Array.from({ length: 250 }, (_, index) => `x${index}.direct.domits.com`);
    const { reconciler, withdrawal } = buildReconciler({ stored });

    await reconciler.run({ limit });

    expect(withdrawal.removePages.mock.calls[0][0].length).toBe(limit === 9999 ? 200 : 50);
  });

  it("carries on after a removal or a queue that fails, and reports each", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({
      stored: ["gone1.direct.domits.com", "gone2.direct.domits.com"],
      entries: [entry("a.direct.domits.com", PUBLISHED), entry("b.direct.domits.com", { ...PUBLISHED, id: "site-2" })],
    });
    withdrawal.removePages.mockResolvedValueOnce({
      removed: ["gone2.direct.domits.com"],
      failures: [{ hostname: "gone1.direct.domits.com", message: "AccessDenied" }],
      invalidationErrors: [{ hostname: "gone2.direct.domits.com", message: "no tenant serves this hostname" }],
    });
    siteRepository.queueStaticPage.mockRejectedValueOnce(new Error("connection lost"));

    const summary = await reconciler.run();

    expect(summary).toMatchObject({
      removed: 1,
      queued: 1,
      errors: [
        { hostname: "gone1.direct.domits.com", message: "AccessDenied" },
        { hostname: "gone2.direct.domits.com", message: "no tenant serves this hostname" },
        { siteId: "site-1", message: "connection lost" },
      ],
    });
  });

  it("reports an orphan whose fresh look failed and removes the others", async () => {
    const { reconciler, withdrawal, domainRepository } = buildReconciler({
      stored: ["gone1.direct.domits.com", "gone2.direct.domits.com"],
    });
    domainRepository.getDomainWithSiteByName.mockRejectedValueOnce(new Error("connection lost"));

    const summary = await reconciler.run();

    expect(withdrawal.removePages).toHaveBeenCalledWith(["gone2.direct.domits.com"]);
    expect(summary.errors).toEqual([{ hostname: "gone1.direct.domits.com", message: "connection lost" }]);
  });

  it("stops before touching anything when the bucket cannot be listed", async () => {
    const { reconciler, pageStore, withdrawal, siteRepository, domainRepository } = buildReconciler();
    pageStore.listPageHostnames.mockRejectedValueOnce(new Error("AccessDenied"));

    await expect(reconciler.run()).rejects.toThrow("AccessDenied");

    expect(domainRepository.listDomainsWithSites).not.toHaveBeenCalled();
    expect(withdrawal.removePages).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
  });
});
