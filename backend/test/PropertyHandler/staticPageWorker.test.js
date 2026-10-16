import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { StaticPageWorker } from "../../functions/PropertyHandler/business/service/staticPageWorker.js";
import { StaticPageStore } from "../../functions/PropertyHandler/data/repository/staticPageStore.js";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";

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
    markPageWithdrawn: jest.fn(async (siteId, revision) => finish(siteId, revision, "WITHDRAWN")),
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

const buildWorker = ({
  rows = [buildJob()],
  sites = [buildSite()],
  domains = [FALLBACK, CUSTOM],
  outbox = null,
  pageStore = null,
  withdrawal = null,
} = {}) => {
  const deps = {
    outboxRepository: outbox || buildOutbox(rows),
    siteRepository: { getSiteById: jest.fn(async (siteId) => sites.find((site) => site.id === siteId) || null) },
    domainRepository: { listDomainsBySiteId: jest.fn(async () => domains) },
    pageStore: pageStore || {
      readAppShell: jest.fn(async () => SHELL),
      putPage: jest.fn(async () => undefined),
      putSitemap: jest.fn(async () => undefined),
    },
    renderer: { render: jest.fn(async () => PAGE) },
    withdrawal: withdrawal || {
      withdraw: jest.fn(async ({ siteId, domains }) => ({
        siteId,
        hostnames: domains.map((domain) => domain.domain),
        invalidationErrors: [],
      })),
    },
  };
  return { worker: new StaticPageWorker(deps), outbox: deps.outboxRepository, ...deps };
};

const EMPTY_SUMMARY = {
  listed: 0,
  built: 0,
  withdrawn: 0,
  skipped: 0,
  superseded: 0,
  notClaimed: 0,
  failed: 0,
  errors: [],
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
      mainAddress: CUSTOM,
      destination: FALLBACK,
    });
    expect(pageStore.putPage.mock.calls.map(([call]) => call)).toEqual([
      { hostname: FALLBACK.domain, html: PAGE, siteId: "site-1", revision: 4 },
      { hostname: CUSTOM.domain, html: PAGE, siteId: "site-1", revision: 4 },
    ]);
    expect(outbox.table.get("site-1")).toMatchObject({ status: "ACTIVE", attemptCount: 1 });
    expect(summary).toEqual({ ...EMPTY_SUMMARY, listed: 1, built: 1 });
  });

  it("withdraws a page even when the shell cannot be read, because a withdrawal needs no shell", async () => {
    const { worker, outbox, pageStore, withdrawal } = buildWorker({ sites: [buildSite({ status: "PREVIEW" })] });
    pageStore.readAppShell.mockRejectedValue(new Error("NoSuchKey"));

    const summary = await worker.run();

    expect(withdrawal.withdraw).toHaveBeenCalledTimes(1);
    expect(outbox.table.get("site-1").status).toBe("WITHDRAWN");
    expect(summary).toMatchObject({ withdrawn: 1, errors: [] });
  });

  it("fails a build whose site was published between the look and the claim and whose shell then cannot be read", async () => {
    const { worker, outbox, siteRepository, pageStore } = buildWorker();
    siteRepository.getSiteById.mockResolvedValueOnce(buildSite({ status: "PREVIEW" }));
    pageStore.readAppShell.mockRejectedValueOnce(new Error("NoSuchKey"));

    const summary = await worker.run();

    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({
      status: "FAILED",
      failureReason: "SHELL_UNREADABLE: NoSuchKey",
    });
    expect(summary).toMatchObject({ failed: 1 });
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

  it("leaves a page that another worker claimed first, without rendering, uploading or withdrawing", async () => {
    const { worker, outbox, renderer, pageStore, withdrawal } = buildWorker();
    outbox.listPagesToBuild.mockResolvedValueOnce([buildJob()]);
    outbox.table.get("site-1").status = "BUILDING";

    const summary = await worker.run();

    expect(renderer.render).not.toHaveBeenCalled();
    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ notClaimed: 1, built: 0 });
  });

  it("skips a site that was deleted after it was queued, uploads nothing and withdraws nothing", async () => {
    const { worker, outbox, pageStore, withdrawal } = buildWorker({ sites: [] });

    const summary = await worker.run();

    expect(pageStore.putPage).not.toHaveBeenCalled();
    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({ status: "SKIPPED", failureReason: "SITE_NOT_FOUND" });
    expect(summary).toMatchObject({ skipped: 1 });
  });

  it.each([
    ["unpublished", buildSite({ status: "PREVIEW" })],
    ["suspended", buildSite({ status: "SUSPENDED" })],
  ])(
    "withdraws the page of a site that is %s, from every domain it has, and marks the row withdrawn",
    async (_label, site) => {
      const disabledFallback = { ...FALLBACK, status: "DISABLED" };
      const { worker, outbox, pageStore, renderer, withdrawal } = buildWorker({
        sites: [site],
        domains: [disabledFallback, CUSTOM],
      });

      const summary = await worker.run();

      expect(renderer.render).not.toHaveBeenCalled();
      expect(pageStore.putPage).not.toHaveBeenCalled();
      expect(withdrawal.withdraw).toHaveBeenCalledWith({ siteId: "site-1", domains: [disabledFallback, CUSTOM] });
      expect(outbox.table.get("site-1")).toMatchObject({ status: "WITHDRAWN", attemptCount: 1 });
      expect(summary).toEqual({ ...EMPTY_SUMMARY, listed: 1, withdrawn: 1 });
    }
  );

  it("records a withdrawal whose delete failed, keeps the row for a retry, and the retry withdraws again", async () => {
    const { worker, outbox, withdrawal } = buildWorker({ sites: [buildSite({ status: "PREVIEW" })] });
    withdrawal.withdraw.mockRejectedValueOnce(new Error("AccessDenied"));

    await worker.run();
    expect(outbox.table.get("site-1")).toMatchObject({
      status: "FAILED",
      failureReason: "S3_DELETE_FAILED: AccessDenied",
    });

    await worker.run();

    expect(withdrawal.withdraw).toHaveBeenCalledTimes(2);
    expect(outbox.table.get("site-1")).toMatchObject({ status: "WITHDRAWN", attemptCount: 2 });
  });

  it("leaves a withdrawal whose domains cannot be read for the next run, like any other lost connection", async () => {
    const { worker, outbox, domainRepository, withdrawal } = buildWorker({ sites: [buildSite({ status: "PREVIEW" })] });
    domainRepository.listDomainsBySiteId.mockRejectedValueOnce(new Error("connection lost"));

    const summary = await worker.run();

    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1").status).toBe("BUILDING");
    expect(summary).toMatchObject({
      failed: 0,
      errors: [{ siteId: "site-1", revision: 4, message: "connection lost" }],
    });
  });

  it("reports an invalidation that failed after a withdrawal, so the run fails loudly, without retrying the withdrawal", async () => {
    const { worker, outbox, withdrawal } = buildWorker({ sites: [buildSite({ status: "PREVIEW" })] });
    withdrawal.withdraw.mockResolvedValueOnce({
      siteId: "site-1",
      hostnames: [FALLBACK.domain],
      invalidationErrors: [{ hostname: FALLBACK.domain, message: "no tenant serves this hostname" }],
    });

    const summary = await worker.run();

    expect(outbox.table.get("site-1")).toMatchObject({ status: "WITHDRAWN" });
    expect(summary).toEqual({
      ...EMPTY_SUMMARY,
      listed: 1,
      withdrawn: 1,
      errors: [
        {
          siteId: "site-1",
          revision: 4,
          message: `INVALIDATION_FAILED: ${FALLBACK.domain}: no tenant serves this hostname`,
        },
      ],
    });
  });

  it("never marks a withdrawal done when the host publishes again during it; the newer row is queued and rebuilt", async () => {
    const republished = buildSite({ status: "PUBLISHED", staticPageRevision: 5 });
    const { worker, outbox, siteRepository, pageStore, withdrawal } = buildWorker({
      sites: [buildSite({ status: "PREVIEW" })],
    });
    withdrawal.withdraw.mockImplementationOnce(async ({ siteId }) => {
      publishAgainWhileBuilding(outbox);
      siteRepository.getSiteById.mockResolvedValue(republished);
      return { siteId, hostnames: [], invalidationErrors: [] };
    });

    const summary = await worker.run();

    expect(outbox.requeueNewerRevision).toHaveBeenCalledWith("site-1", 4);
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "PENDING" });
    expect(summary).toMatchObject({ superseded: 1, withdrawn: 0 });

    const nextSummary = await worker.run();

    expect(pageStore.putPage).toHaveBeenCalledTimes(2);
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "ACTIVE" });
    expect(nextSummary).toMatchObject({ built: 1 });
  });

  it("lets unpublish, publish and unpublish pass during one withdrawal, and only the last revision ends withdrawn", async () => {
    const { worker, outbox, siteRepository, withdrawal } = buildWorker({ sites: [buildSite({ status: "PREVIEW" })] });
    const second = buildWorker({ outbox, sites: [] });
    let secondSummary = null;
    withdrawal.withdraw.mockImplementationOnce(async ({ siteId }) => {
      Object.assign(outbox.table.get("site-1"), { revision: 6 });
      siteRepository.getSiteById.mockResolvedValue(buildSite({ status: "PREVIEW", staticPageRevision: 6 }));
      outbox.listPagesToBuild.mockResolvedValueOnce([buildJob({ revision: 6 })]);
      secondSummary = await second.worker.run();
      return { siteId, hostnames: [], invalidationErrors: [] };
    });

    const first = await worker.run();

    expect(secondSummary).toMatchObject({ listed: 1, notClaimed: 1, withdrawn: 0 });
    expect(second.withdrawal.withdraw).not.toHaveBeenCalled();
    expect(first).toMatchObject({ superseded: 1, withdrawn: 0, failed: 0 });
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 6, status: "PENDING" });

    const next = await worker.run();

    expect(withdrawal.withdraw).toHaveBeenCalledTimes(2);
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 6, status: "WITHDRAWN" });
    expect(next).toMatchObject({ withdrawn: 1 });
  });

  it("hands an unpublish that was outrun by a newer unpublish to the next run without withdrawing twice", async () => {
    const { worker, outbox, withdrawal } = buildWorker({
      sites: [buildSite({ status: "PREVIEW", staticPageRevision: 5 })],
    });
    outbox.claimPage.mockImplementationOnce(async () => {
      Object.assign(publishAgainWhileBuilding(outbox), { status: "BUILDING" });
      return true;
    });

    const summary = await worker.run();

    expect(withdrawal.withdraw).not.toHaveBeenCalled();
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "PENDING" });
    expect(summary).toMatchObject({ superseded: 1 });
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
      expect(renderer.render.mock.calls[0][0].mainAddress).toEqual({ ...fallback, status: "ACTIVE" });
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

      expect(renderer.render.mock.calls[0][0].mainAddress.domain).toBe(expected);
    }
  );

  it("renders without a main address, like the public page, when no row answers its rule", async () => {
    const unflaggedCustom = { ...CUSTOM, isPrimary: false };
    const { worker, outbox, renderer } = buildWorker({ domains: [unflaggedCustom] });

    const summary = await worker.run();

    expect(renderer.render.mock.calls[0][0]).toMatchObject({ mainAddress: null, destination: unflaggedCustom });
    expect(outbox.table.get("site-1").status).toBe("ACTIVE");
    expect(summary).toMatchObject({ built: 1 });
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

const SITEMAP_BUCKET = "sites-bucket-under-test";
const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
const sitemapListing = (url) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc></url>\n</urlset>\n`;
const pageKey = (hostname) => `sites/by-host/${hostname}/index.html`;
const sitemapKey = (hostname) => `sites/by-host/${hostname}/sitemap.xml`;

const buildBucket = (objects = {}) => {
  const bucket = { objects: new Map(Object.entries(objects)), writes: [], failures: new Map(), onWrite: null };
  bucket.client = {
    send: jest.fn(async (command) => {
      const { Key, Body } = command.input;
      if (bucket.failures.has(Key)) {
        throw bucket.failures.get(Key);
      }
      if (command instanceof GetObjectCommand) {
        if (!bucket.objects.has(Key)) {
          throw Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
        }
        return { Body: { transformToString: async () => bucket.objects.get(Key) } };
      }
      if (command instanceof PutObjectCommand) {
        bucket.objects.set(Key, Body);
        bucket.writes.push({ key: Key, contentType: command.input.ContentType });
        await bucket.onWrite?.(Key);
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        bucket.objects.delete(Key);
        return {};
      }
      throw new Error(`unexpected ${command.constructor.name}`);
    }),
  };
  return bucket;
};

const buildWorkerOnBucket = (bucket, options = {}) =>
  buildWorker({ ...options, pageStore: new StaticPageStore({ client: bucket.client }) });

describe("the sitemap the worker writes per host", () => {
  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = SITEMAP_BUCKET;
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET;
  });

  it("lists the root on the main address and writes a valid empty sitemap on every other host", async () => {
    const bucket = buildBucket({ "index.html": SHELL });
    const { worker, outbox } = buildWorkerOnBucket(bucket);

    await worker.run();

    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(sitemapListing("https://www.cliffhouse.nl/"));
    expect(bucket.objects.get(sitemapKey(FALLBACK.domain))).toBe(EMPTY_SITEMAP);
    expect(
      bucket.writes.filter((write) => write.key.endsWith("sitemap.xml")).map((write) => write.contentType)
    ).toEqual(["application/xml; charset=utf-8", "application/xml; charset=utf-8"]);
    expect(outbox.table.get("site-1").status).toBe("ACTIVE");
  });

  it("empties the sitemaps first, writes the pages next and the listing last, so no sitemap names a page that says otherwise", async () => {
    const bucket = buildBucket({ "index.html": SHELL });
    const { worker } = buildWorkerOnBucket(bucket);

    await worker.run();

    expect(bucket.writes.map((write) => write.key)).toEqual([
      sitemapKey(FALLBACK.domain),
      pageKey(FALLBACK.domain),
      pageKey(CUSTOM.domain),
      sitemapKey(CUSTOM.domain),
    ]);
  });

  it("lists nothing anywhere while the main address is not active, like the noindex page it sits next to", async () => {
    const bucket = buildBucket({ "index.html": SHELL });
    const disabledFallback = { ...FALLBACK, status: "DISABLED" };
    const secondaryCustom = { ...CUSTOM, isPrimary: false };
    const { worker } = buildWorkerOnBucket(bucket, { domains: [disabledFallback, secondaryCustom] });

    await worker.run();

    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(EMPTY_SITEMAP);
    expect(bucket.objects.has(sitemapKey(FALLBACK.domain))).toBe(false);
  });

  it("keeps the last good page and sitemap of every host when the render fails", async () => {
    const before = {
      "index.html": SHELL,
      [pageKey(CUSTOM.domain)]: "<html>last good</html>",
      [sitemapKey(CUSTOM.domain)]: sitemapListing("https://www.cliffhouse.nl/"),
    };
    const bucket = buildBucket(before);
    const { worker, outbox, renderer } = buildWorkerOnBucket(bucket);
    renderer.render.mockRejectedValue(new Error("template crashed"));

    await worker.run();

    expect(Object.fromEntries(bucket.objects)).toEqual(before);
    expect(outbox.table.get("site-1")).toMatchObject({ status: "FAILED" });
  });

  it("changes nothing on any host when a sitemap that must go empty cannot be written, and the retry finishes the move", async () => {
    const before = {
      "index.html": SHELL,
      [pageKey(CUSTOM.domain)]: "<html>custom was the main address</html>",
      [sitemapKey(CUSTOM.domain)]: sitemapListing("https://www.cliffhouse.nl/"),
    };
    const bucket = buildBucket(before);
    bucket.failures.set(sitemapKey(CUSTOM.domain), new Error("SlowDown"));
    const { worker, outbox } = buildWorkerOnBucket(bucket, {
      domains: [FALLBACK, { ...CUSTOM, isPrimary: false }],
    });

    await worker.run();

    expect(outbox.table.get("site-1")).toMatchObject({ status: "FAILED" });
    expect(outbox.table.get("site-1").failureReason).toContain("S3_PUT_FAILED");
    expect(bucket.objects.get(pageKey(CUSTOM.domain))).toBe(before[pageKey(CUSTOM.domain)]);
    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(before[sitemapKey(CUSTOM.domain)]);

    bucket.failures.clear();
    await worker.run();

    expect(outbox.table.get("site-1")).toMatchObject({ status: "ACTIVE", attemptCount: 2 });
    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(EMPTY_SITEMAP);
    expect(bucket.objects.get(sitemapKey(FALLBACK.domain))).toBe(sitemapListing(`https://${FALLBACK.domain}/`));
  });

  it("never lists a host whose page could not be written, so a failed page keeps an unlisted host unlisted", async () => {
    const bucket = buildBucket({ "index.html": SHELL, [sitemapKey(CUSTOM.domain)]: EMPTY_SITEMAP });
    bucket.failures.set(pageKey(CUSTOM.domain), new Error("SlowDown"));
    const { worker, outbox } = buildWorkerOnBucket(bucket);

    await worker.run();

    expect(outbox.table.get("site-1")).toMatchObject({ status: "FAILED" });
    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(EMPTY_SITEMAP);
  });

  it("empties the sitemap of every host when the site is unpublished, so a withdrawn site lists no page", async () => {
    const bucket = buildBucket({ "index.html": SHELL });
    const sites = [buildSite()];
    const pageStore = new StaticPageStore({ client: bucket.client });
    const tenantRepository = {
      listTenantsForDistribution: jest.fn(async () => [{ id: "dt_wildcard", domains: ["*.direct.domits.com"] }]),
      getTenantByDomain: jest.fn(async (domain) => (domain === CUSTOM.domain ? { id: "dt_custom" } : null)),
      createInvalidation: jest.fn(async () => "I1"),
    };
    const withdrawal = new StaticPageWithdrawal({ pageStore, tenantRepository, distributionId: "E18DIST" });
    const { worker, outbox } = buildWorker({ sites, pageStore, withdrawal });
    await worker.run();
    Object.assign(sites[0], { status: "PREVIEW", staticPageRevision: 5 });
    Object.assign(outbox.table.get("site-1"), { revision: 5, status: "PENDING", attemptCount: 0 });

    const summary = await worker.run();

    expect(summary.withdrawn).toBe(1);
    expect(bucket.objects.has(pageKey(CUSTOM.domain))).toBe(false);
    expect(bucket.objects.has(pageKey(FALLBACK.domain))).toBe(false);
    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(EMPTY_SITEMAP);
    expect(bucket.objects.get(sitemapKey(FALLBACK.domain))).toBe(EMPTY_SITEMAP);
    expect(tenantRepository.createInvalidation.mock.calls.flatMap(([call]) => call.paths)).toContain("/sitemap.xml");
  });

  it("ends with the sitemaps of the newest revision when the host publishes again during a build", async () => {
    const bucket = buildBucket({ "index.html": SHELL });
    const sites = [buildSite()];
    let domains = [FALLBACK, CUSTOM];
    const { worker, outbox, domainRepository } = buildWorkerOnBucket(bucket, { sites });
    domainRepository.listDomainsBySiteId.mockImplementation(async () => domains);
    bucket.onWrite = async () => {
      bucket.onWrite = null;
      publishAgainWhileBuilding(outbox);
      sites[0].staticPageRevision = 5;
      domains = [FALLBACK, { ...CUSTOM, isPrimary: false }];
    };

    const firstRun = await worker.run();
    const secondRun = await worker.run();

    expect(firstRun.superseded).toBe(1);
    expect(secondRun.built).toBe(1);
    expect(outbox.table.get("site-1")).toMatchObject({ revision: 5, status: "ACTIVE" });
    expect(bucket.objects.get(sitemapKey(CUSTOM.domain))).toBe(EMPTY_SITEMAP);
    expect(bucket.objects.get(sitemapKey(FALLBACK.domain))).toBe(sitemapListing(`https://${FALLBACK.domain}/`));
  });
});
