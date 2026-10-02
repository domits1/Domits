import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { StaticPageWorker } from "../../functions/PropertyHandler/business/service/staticPageWorker.js";

const SHELL = '<html><head></head><body><div id="root"></div></body></html>';
const PAGE = "<html>rendered</html>";
const FALLBACK = {
  domain: "cliff-house-site-1.direct.domits.com",
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: false,
};
const CUSTOM = { domain: "www.cliffhouse.nl", domainType: "CUSTOM", status: "ACTIVE", isPrimary: true };

const buildSite = (overrides = {}) => ({ id: "site-1", status: "PUBLISHED", staticPageRevision: 4, ...overrides });

const buildJob = (overrides = {}) => ({
  siteId: "site-1",
  revision: 4,
  status: "PENDING",
  attemptCount: 0,
  ...overrides,
});

const isClaimable = (row) => ["PENDING", "FAILED"].includes(row.status) && row.attemptCount < 5;

const buildOutbox = (rows) => {
  const table = new Map(rows.map((row) => [row.siteId, { ...row }]));
  const finish = (siteId, revision, status, failureReason = "") => {
    const row = table.get(siteId);
    if (!row || row.revision !== revision || row.status !== "BUILDING") {
      return false;
    }
    Object.assign(row, { status, failureReason });
    return true;
  };
  return {
    table,
    listPagesToBuild: jest.fn(async () => [...table.values()].filter(isClaimable).map((row) => ({ ...row }))),
    claimPage: jest.fn(async (siteId, revision) => {
      const row = table.get(siteId);
      if (!row || row.revision !== revision || !isClaimable(row)) {
        return false;
      }
      Object.assign(row, { status: "BUILDING", attemptCount: row.attemptCount + 1 });
      return true;
    }),
    markPageActive: jest.fn(async (siteId, revision) => finish(siteId, revision, "ACTIVE")),
    markPageFailed: jest.fn(async (siteId, revision, reason) => finish(siteId, revision, "FAILED", reason)),
    skipPage: jest.fn(async (siteId, revision, reason) => finish(siteId, revision, "SKIPPED", reason)),
    requeueNewerRevision: jest.fn(async (siteId, revision) => {
      const row = table.get(siteId);
      if (!row || row.revision <= revision || !["BUILDING", "ACTIVE"].includes(row.status)) {
        return false;
      }
      row.status = "PENDING";
      return true;
    }),
  };
};

const buildWorker = ({ rows = [buildJob()], sites = [buildSite()], domains = [FALLBACK, CUSTOM] } = {}) => {
  const deps = {
    outboxRepository: buildOutbox(rows),
    siteRepository: { getSiteById: jest.fn(async (siteId) => sites.find((site) => site.id === siteId) || null) },
    domainRepository: { listDomainsBySiteId: jest.fn(async () => domains) },
    pageStore: { readAppShell: jest.fn(async () => SHELL), putPage: jest.fn(async () => undefined) },
    renderer: { render: jest.fn(async () => PAGE) },
  };
  return { worker: new StaticPageWorker(deps), outbox: deps.outboxRepository, ...deps };
};

const publishAgainWhileBuilding = (outbox) =>
  Object.assign(outbox.table.get("site-1"), { revision: 5, attemptCount: 0 });

describe("StaticPageWorker", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders with the shell and the primary domain, uploads per active domain and marks the page active", async () => {
    const { worker, outbox, pageStore, renderer } = buildWorker();

    const summary = await worker.run({ limit: 7 });

    expect(outbox.listPagesToBuild).toHaveBeenCalledWith({ limit: 7 });
    expect(renderer.render).toHaveBeenCalledWith({
      template: SHELL,
      site: expect.objectContaining(buildSite()),
      domain: CUSTOM,
    });
    expect(pageStore.putPage.mock.calls.map(([call]) => call)).toEqual([
      { hostname: FALLBACK.domain, html: PAGE, siteId: "site-1", revision: 4 },
      { hostname: CUSTOM.domain, html: PAGE, siteId: "site-1", revision: 4 },
    ]);
    expect(outbox.table.get("site-1")).toMatchObject({ status: "ACTIVE", attemptCount: 1 });
    expect(summary).toEqual({ listed: 1, built: 1, skipped: 0, superseded: 0, notClaimed: 0, failed: 0, errors: [] });
  });

  it("reads the shell again for every page, and claims nothing for a page whose shell cannot be read", async () => {
    const { worker, outbox, pageStore, renderer } = buildWorker({
      rows: [buildJob(), buildJob({ siteId: "site-2" })],
      sites: [buildSite(), buildSite({ id: "site-2" })],
    });
    pageStore.readAppShell.mockResolvedValueOnce("<html>first</html>").mockRejectedValueOnce(new Error("NoSuchKey"));

    const summary = await worker.run();

    expect(renderer.render.mock.calls[0][0].template).toBe("<html>first</html>");
    expect(outbox.claimPage).toHaveBeenCalledTimes(1);
    expect(outbox.table.get("site-2").status).toBe("PENDING");
    expect(summary).toMatchObject({ built: 1, errors: [{ siteId: "site-2", revision: 4, message: "NoSuchKey" }] });
  });

  it("leaves a page that another worker claimed first, without touching the site or the bucket", async () => {
    const { worker, outbox, siteRepository, pageStore } = buildWorker();
    outbox.listPagesToBuild.mockResolvedValueOnce([buildJob()]);
    outbox.table.get("site-1").status = "BUILDING";

    const summary = await worker.run();

    expect(siteRepository.getSiteById).not.toHaveBeenCalled();
    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ notClaimed: 1, built: 0 });
  });

  it.each([
    ["was deleted", [], "SITE_NOT_FOUND"],
    ["was unpublished", [buildSite({ status: "PREVIEW" })], "SITE_NOT_PUBLISHED"],
  ])("skips a site that %s after it was queued, and uploads nothing", async (_label, sites, reason) => {
    const { worker, outbox, pageStore } = buildWorker({ sites });

    const summary = await worker.run();

    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({ status: "SKIPPED", failureReason: reason });
    expect(summary).toMatchObject({ skipped: 1 });
  });

  it("stops before rendering when the site carries a newer revision, and hands the row to the next run", async () => {
    const { worker, outbox, pageStore, renderer } = buildWorker({ sites: [buildSite({ staticPageRevision: 5 })] });
    outbox.claimPage.mockImplementationOnce(async () => {
      Object.assign(publishAgainWhileBuilding(outbox), { status: "BUILDING" });
      return true;
    });

    const summary = await worker.run();

    expect(renderer.render).not.toHaveBeenCalled();
    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "PENDING" });
    expect(summary).toMatchObject({ superseded: 1 });
  });

  it.each([
    [
      "has no active domain, so a disabled domain gets no page",
      "domainRepository",
      [{ ...FALLBACK, status: "DISABLED" }],
      "NO_ACTIVE_DOMAIN",
    ],
    [
      "carries a hostname that is not a domain name",
      "domainRepository",
      [{ ...CUSTOM, domain: "Cliff House/../index" }],
      "INVALID_DOMAIN: ",
    ],
    [
      "cannot be rendered",
      "renderer",
      new Error("Cannot prerender without a heading."),
      "RENDER_FAILED: Cannot prerender without a heading.",
    ],
  ])("fails a site that %s, records the reason and uploads nothing", async (_label, dependency, outcome, reason) => {
    const deps = buildWorker();
    const { worker, outbox, pageStore } = deps;
    if (outcome instanceof Error) {
      deps[dependency].render.mockRejectedValueOnce(outcome);
    } else {
      deps[dependency].listDomainsBySiteId.mockResolvedValueOnce(outcome);
    }

    const summary = await worker.run();

    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({
      status: "FAILED",
      failureReason: expect.stringContaining(reason),
    });
    expect(summary).toMatchObject({ failed: 1 });
  });

  it.each([
    ["stored PENDING", { ...FALLBACK, status: "PENDING", isPrimary: true }],
    [
      "disabled by the host",
      { ...FALLBACK, status: "DISABLED", isPrimary: true, verificationDetails: { disabledByHost: true } },
    ],
  ])(
    "gives a fallback domain %s the status the public site gives it, so the page is not rendered as unreachable",
    async (_label, fallback) => {
      process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE = "true";
      const { worker, pageStore, renderer } = buildWorker({ domains: [fallback] });

      await worker.run();

      delete process.env.DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE;
      expect(renderer.render.mock.calls[0][0].domain).toEqual({ ...fallback, status: "ACTIVE" });
      expect(pageStore.putPage).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    [
      "the fallback carries the flag",
      [
        { ...FALLBACK, isPrimary: true },
        { ...CUSTOM, isPrimary: false },
      ],
      FALLBACK.domain,
    ],
    ["a live custom domain carries the flag", [FALLBACK, CUSTOM], CUSTOM.domain],
    ["no row carries the flag", [FALLBACK, { ...CUSTOM, isPrimary: false }], FALLBACK.domain],
    ["both carry the flag and the custom domain is live", [{ ...FALLBACK, isPrimary: true }, CUSTOM], CUSTOM.domain],
    [
      "both carry the flag and the custom domain is not live",
      [
        { ...FALLBACK, isPrimary: true },
        { ...CUSTOM, status: "VERIFIED" },
      ],
      FALLBACK.domain,
    ],
    ...["PENDING", "VERIFIED", "FAILED", "DISABLED", "REMOVING"].map((status) => [
      `the flagged custom domain is ${status}`,
      [FALLBACK, { ...CUSTOM, status }],
      FALLBACK.domain,
    ]),
  ])(
    "renders with the main address the public page names when %s, so both carry the same canonical",
    async (_label, domains, expected) => {
      const { worker, renderer } = buildWorker({ domains });

      await worker.run();

      expect(renderer.render.mock.calls[0][0].domain.domain).toBe(expected);
    }
  );

  it("fails the page instead of guessing when no row answers the public page's rule for the main address", async () => {
    const { worker, outbox, renderer } = buildWorker({ domains: [{ ...CUSTOM, isPrimary: false }] });

    const summary = await worker.run();

    expect(renderer.render).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({ status: "FAILED", failureReason: "NO_MAIN_ADDRESS" });
    expect(summary).toMatchObject({ failed: 1 });
  });

  it("records an upload failure, never marks the page active, and the retry writes the same keys again", async () => {
    const { worker, outbox, pageStore } = buildWorker();
    pageStore.putPage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("AccessDenied"));

    await worker.run();
    const firstRun = pageStore.putPage.mock.calls.map(([call]) => call);
    expect(outbox.markPageActive).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({
      status: "FAILED",
      failureReason: "S3_PUT_FAILED: AccessDenied",
    });

    await worker.run();

    expect(pageStore.putPage.mock.calls.slice(2).map(([call]) => call)).toEqual(firstRun);
    expect(outbox.table.get("site-1")).toMatchObject({ status: "ACTIVE", attemptCount: 2 });
  });

  it.each([
    ["the upload succeeds", async () => undefined],
    ["the next upload fails", async () => Promise.reject(new Error("AccessDenied"))],
  ])(
    "never marks a newer publish done when it lands during the upload and %s; the newer row is queued again",
    async (_label, nextUpload) => {
      const { worker, outbox, pageStore } = buildWorker();
      pageStore.putPage
        .mockImplementationOnce(async () => publishAgainWhileBuilding(outbox))
        .mockImplementationOnce(nextUpload);

      const summary = await worker.run();

      expect(outbox.requeueNewerRevision).toHaveBeenCalledWith("site-1", 4);
      expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "PENDING" });
      expect(summary).toMatchObject({ superseded: 1, built: 0, failed: 0 });
    }
  );

  it("reports a status write that fails and carries on with the next site", async () => {
    const { worker, outbox, pageStore } = buildWorker({
      rows: [buildJob(), buildJob({ siteId: "site-2" })],
      sites: [buildSite(), buildSite({ id: "site-2" })],
    });
    outbox.markPageActive.mockRejectedValueOnce(new Error("connection lost"));

    const summary = await worker.run();

    expect(pageStore.putPage).toHaveBeenCalledTimes(4);
    expect(outbox.table.get("site-1").status).toBe("BUILDING");
    expect(outbox.table.get("site-2").status).toBe("ACTIVE");
    expect(summary).toMatchObject({
      built: 1,
      errors: [{ siteId: "site-1", revision: 4, message: "connection lost" }],
    });
  });

  it("builds the sites one at a time, so two renders of one run cannot interleave", async () => {
    const order = [];
    const { worker, outbox, renderer } = buildWorker({
      rows: [buildJob(), buildJob({ siteId: "site-2" })],
      sites: [buildSite(), buildSite({ id: "site-2" })],
    });
    outbox.claimPage.mockImplementation(async (siteId) => (order.push(`claim ${siteId}`), true));
    renderer.render.mockImplementation(async ({ site }) => (order.push(`render ${site.id}`), PAGE));

    await worker.run();

    expect(order).toEqual(["claim site-1", "render site-1", "claim site-2", "render site-2"]);
  });
});
