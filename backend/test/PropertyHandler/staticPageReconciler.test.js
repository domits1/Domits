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

const buildReconciler = ({ stored = [], entries = [], rows = [] } = {}) => {
  const calls = [];
  const deps = {
    pageStore: { listPageHostnames: jest.fn(async () => (calls.push("list"), stored)) },
    siteRepository: { queueStaticPage: jest.fn(async () => true) },
    domainRepository: { listDomainsWithSites: jest.fn(async () => (calls.push("sql"), entries)) },
    outboxRepository: {
      listPagesBySiteIds: jest.fn(async (siteIds) => rows.filter((candidate) => siteIds.includes(candidate.siteId))),
    },
    withdrawal: { withdraw: jest.fn(async ({ siteId }) => ({ siteId, hostnames: [], invalidationErrors: [] })) },
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

    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary).toEqual({ stored: 1, expected: 1, removed: 0, queued: 0, stuck: [], errors: [] });
  });

  it("removes the page of a site that is no longer published, of a domain no site owns, and of a domain that is not active", async () => {
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

    expect(withdrawal.withdraw.mock.calls.map(([call]) => call.domains[0].domain)).toEqual([
      "b.direct.domits.com",
      "gone.direct.domits.com",
      "www.pending.nl",
    ]);
    expect(summary).toMatchObject({ removed: 3, queued: 0 });
  });

  it("lists the bucket before reading the sites, so a page written during the run is never taken for an orphan", async () => {
    const { reconciler, calls } = buildReconciler();

    await reconciler.run();

    expect(calls).toEqual(["list", "sql"]);
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
    ["is being built", row("site-1", "BUILDING")],
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

  it("reports a site whose builds are exhausted instead of queueing it again every hour", async () => {
    const { reconciler, siteRepository } = buildReconciler({
      entries: [entry("a.direct.domits.com", PUBLISHED)],
      rows: [{ ...row("site-1", "FAILED", 5), failureReason: "RENDER_FAILED: no heading" }],
    });

    const summary = await reconciler.run();

    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
    expect(summary.stuck).toEqual([{ siteId: "site-1", failureReason: "RENDER_FAILED: no heading" }]);
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

    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
  });

  it("does at most the limit of removals and of queued sites per run", async () => {
    const stored = ["x1.direct.domits.com", "x2.direct.domits.com", "x3.direct.domits.com"];
    const entries = ["s1", "s2", "s3"].map((id) => entry(`${id}.direct.domits.com`, { ...PUBLISHED, id }));
    const { reconciler, withdrawal, siteRepository } = buildReconciler({ stored, entries });

    const summary = await reconciler.run({ limit: 2 });

    expect(withdrawal.withdraw).toHaveBeenCalledTimes(2);
    expect(siteRepository.queueStaticPage).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ removed: 2, queued: 2 });
  });

  it("carries on after a removal or a queue that fails, and reports each", async () => {
    const { reconciler, withdrawal, siteRepository } = buildReconciler({
      stored: ["gone1.direct.domits.com", "gone2.direct.domits.com"],
      entries: [entry("a.direct.domits.com", PUBLISHED), entry("b.direct.domits.com", { ...PUBLISHED, id: "site-2" })],
    });
    withdrawal.withdraw.mockRejectedValueOnce(new Error("AccessDenied"));
    siteRepository.queueStaticPage.mockRejectedValueOnce(new Error("connection lost"));

    const summary = await reconciler.run();

    expect(summary).toMatchObject({
      removed: 1,
      queued: 1,
      errors: [
        { hostname: "gone1.direct.domits.com", message: "AccessDenied" },
        { siteId: "site-1", message: "connection lost" },
      ],
    });
  });

  it("reports an invalidation that failed after an orphan was removed", async () => {
    const { reconciler, withdrawal } = buildReconciler({ stored: ["gone.direct.domits.com"] });
    withdrawal.withdraw.mockResolvedValueOnce({
      siteId: "",
      hostnames: ["gone.direct.domits.com"],
      invalidationErrors: [{ hostname: "gone.direct.domits.com", message: "no tenant serves this hostname" }],
    });

    const summary = await reconciler.run();

    expect(summary).toMatchObject({
      removed: 1,
      errors: [{ hostname: "gone.direct.domits.com", message: "no tenant serves this hostname" }],
    });
  });

  it("stops before touching anything when the bucket cannot be listed", async () => {
    const { reconciler, pageStore, withdrawal, siteRepository, domainRepository } = buildReconciler();
    pageStore.listPageHostnames.mockRejectedValueOnce(new Error("AccessDenied"));

    await expect(reconciler.run()).rejects.toThrow("AccessDenied");

    expect(domainRepository.listDomainsWithSites).not.toHaveBeenCalled();
    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(siteRepository.queueStaticPage).not.toHaveBeenCalled();
  });
});
