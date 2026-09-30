import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { StaticPageOutboxRepository } from "../../functions/PropertyHandler/data/repository/staticPageOutboxRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";
const NOW = 1_790_000_000_000;

const OUTBOX_ROW = {
  site_id: "site-1",
  property_id: "property-1",
  host_id: "host-1",
  revision: "4",
  status: "PENDING",
  attempt_count: 2,
  failure_reason: null,
  created_at: "1789000000000",
  updated_at: "1789500000000",
  processed_at: null,
};

const buildClient = (records) => {
  const queryRunner = {
    query: jest.fn(async (statement, parameters, useStructuredResult) =>
      useStructuredResult
        ? { records, affected: records.length, raw: [records, records.length] }
        : [records, records.length]
    ),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    options: { schema: "main" },
    queryRunner,
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(async () => records),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

describe("StaticPageOutboxRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("offers a page that failed once back to the worker, like the booking outbox does", async () => {
    const client = buildClient([
      { ...OUTBOX_ROW, status: "FAILED", failure_reason: "S3_PUT_FAILED", attempt_count: 1 },
    ]);

    const pages = await new StaticPageOutboxRepository().listPagesToBuild({ now: NOW });

    expect(client.query.mock.calls[0][0]).toContain("OR (status = 'FAILED' AND updated_at < $1)");
    expect(client.query.mock.calls[0][1][0]).toBe(NOW - 10 * 60 * 1000);
    expect(pages).toEqual([
      expect.objectContaining({ siteId: "site-1", status: "FAILED", failureReason: "S3_PUT_FAILED", attemptCount: 1 }),
    ]);
  });

  it("leaves a page that is already active alone", async () => {
    const client = buildClient([]);

    await new StaticPageOutboxRepository().listPagesToBuild();

    expect(client.query.mock.calls[0][0]).not.toContain("'ACTIVE'");
  });

  it("offers a page whose build lease ran out, and stops offering one at the attempt limit", async () => {
    const client = buildClient([]);

    await new StaticPageOutboxRepository().listPagesToBuild({ now: NOW });

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain("OR (status = 'BUILDING' AND updated_at < $2))");
    expect(statement).toContain("AND attempt_count < $3");
    expect(parameters.slice(1, 3)).toEqual([NOW - 15 * 60 * 1000, 5]);
  });

  it("lists the pages oldest first and maps the row to numbers", async () => {
    const client = buildClient([OUTBOX_ROW]);

    const pages = await new StaticPageOutboxRepository().listPagesToBuild({ limit: 10, now: NOW });

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain(`FROM ${SCHEMA}.static_page_outbox`);
    expect(statement).toContain("WHERE (status = 'PENDING'");
    expect(statement).toContain("ORDER BY updated_at ASC");
    expect(parameters).toEqual([NOW - 10 * 60 * 1000, NOW - 15 * 60 * 1000, 5, 10]);
    expect(pages).toEqual([
      {
        siteId: "site-1",
        propertyId: "property-1",
        hostId: "host-1",
        revision: 4,
        status: "PENDING",
        attemptCount: 2,
        failureReason: "",
        createdAt: 1_789_000_000_000,
        updatedAt: 1_789_500_000_000,
        processedAt: null,
      },
    ]);
  });

  it("caps the page size so one run cannot pull the whole table", async () => {
    const client = buildClient([]);

    await new StaticPageOutboxRepository().listPagesToBuild({ limit: 5000, now: NOW });

    expect(client.query.mock.calls[0][1][3]).toBe(200);
  });

  it("reads an empty list when nothing is pending", async () => {
    buildClient([]);

    await expect(new StaticPageOutboxRepository().listPagesToBuild()).resolves.toEqual([]);
  });

  it("marks a page active only for the revision the caller rendered, and only while the site is still published", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW });

    const [statement, parameters, useStructuredResult] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain(`UPDATE ${SCHEMA}.static_page_outbox`);
    expect(statement).toContain("WHERE site_id = $1");
    expect(statement).toContain("AND revision = $2");
    expect(statement).toContain("AND status = 'BUILDING'");
    expect(statement).toContain(`FROM ${SCHEMA}.standalone_site AS site`);
    expect(statement).toContain("AND site.status = 'PUBLISHED'");
    expect(statement).toContain("WHERE site.id = $5");
    expect(statement).toContain("AND site.static_page_revision = $2");
    expect(statement).toContain("FOR UPDATE");
    expect(parameters).toEqual(["site-1", 4, "ACTIVE", NOW, "site-1"]);
    expect(useStructuredResult).toBe(true);
    expect(client.queryRunner.release).toHaveBeenCalledTimes(1);
    expect(applied).toBe(true);
  });

  it("records a failure against the revision that failed without counting a second attempt", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().markPageFailed("site-1", 4, "S3_PUT_FAILED", { now: NOW });

    const [statement, parameters] = client.queryRunner.query.mock.calls[0];
    expect(statement).not.toContain("attempt_count");
    expect(statement).toContain("AND revision = $2");
    expect(statement).toContain("AND status = 'BUILDING'");
    expect(parameters).toEqual(["site-1", 4, "FAILED", "S3_PUT_FAILED", NOW, null]);
    expect(applied).toBe(true);
  });

  it("releases the query runner when a status write throws", async () => {
    const client = buildClient([]);
    client.queryRunner.query.mockRejectedValueOnce(new Error("connection lost"));

    await expect(new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW })).rejects.toThrow(
      "connection lost"
    );
    expect(client.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it("claims a page for one worker by moving it to BUILDING and counting the attempt", async () => {
    const client = buildClient([{ site_id: "site-1", attempt_count: 1 }]);

    const claimed = await new StaticPageOutboxRepository().claimPage("site-1", 4, { now: NOW });

    const [statement, parameters] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain("SET status = 'BUILDING'");
    expect(statement).toContain("attempt_count = attempt_count + 1");
    expect(statement).toContain("WHERE site_id = $1");
    expect(statement).toContain("AND revision = $2");
    expect(statement).toContain("OR (status = 'FAILED' AND updated_at < $4)");
    expect(statement).toContain("OR (status = 'BUILDING' AND updated_at < $5))");
    expect(statement).toContain("AND attempt_count < $6");
    expect(parameters).toEqual(["site-1", 4, NOW, NOW - 10 * 60 * 1000, NOW - 15 * 60 * 1000, 5]);
    expect(claimed).toBe(true);
  });

  it("loses a claim or an activation the database rejects as a concurrent write, and reports any other error", async () => {
    const client = buildClient([{ site_id: "site-1" }]);
    const repository = new StaticPageOutboxRepository();
    client.queryRunner.query.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "OC001" }));
    client.queryRunner.query.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "40001" }));
    client.queryRunner.query.mockRejectedValueOnce(new Error("connection lost"));

    await expect(repository.claimPage("site-1", 4, { now: NOW })).resolves.toBe(false);
    await expect(repository.markPageActive("site-1", 4, { now: NOW })).resolves.toBe(false);
    await expect(repository.claimPage("site-1", 4, { now: NOW })).rejects.toThrow("connection lost");
    expect(client.queryRunner.release).toHaveBeenCalledTimes(3);
  });

  it("skips a page whose site is gone or unpublished, so it waits for the next publish", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().skipPage("site-1", 4, "SITE_NOT_PUBLISHED", { now: NOW });

    const [statement, parameters] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain("AND status = 'BUILDING'");
    expect(parameters).toEqual(["site-1", 4, "SKIPPED", "SITE_NOT_PUBLISHED", NOW, NOW]);
    expect(applied).toBe(true);
  });

  it("queues a newer revision again after an older upload may have overwritten its page", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().requeueNewerRevision("site-1", 4, { now: NOW });

    const [statement, parameters] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain("SET status = 'PENDING'");
    expect(statement).toContain("AND revision > $2");
    expect(statement).toContain("AND status = ANY($3)");
    expect(parameters).toEqual(["site-1", 4, ["BUILDING", "ACTIVE"], NOW]);
    expect(applied).toBe(true);
  });

  it.each([
    ["mark a page active", (repository) => repository.markPageActive("site-1", 4, { now: NOW })],
    ["record a failure", (repository) => repository.markPageFailed("site-1", 4, "x", { now: NOW })],
    ["claim a page", (repository) => repository.claimPage("site-1", 4, { now: NOW })],
  ])("reports false when it cannot %s because the row is no longer the one it expected", async (_label, write) => {
    buildClient([]);

    await expect(write(new StaticPageOutboxRepository())).resolves.toBe(false);
  });

  it("refuses a status write without a positive revision, so a missing revision cannot match every row", async () => {
    const client = buildClient([{ site_id: "site-1" }]);
    const repository = new StaticPageOutboxRepository();

    await expect(repository.markPageActive("site-1", 0, { now: NOW })).rejects.toThrow(
      "A static page revision must be a positive integer."
    );
    await expect(repository.markPageFailed("site-1", undefined, "x", { now: NOW })).rejects.toThrow(
      "A static page revision must be a positive integer."
    );
    await expect(repository.markPageActive("", 4, { now: NOW })).rejects.toThrow("A site id is required.");
    expect(client.queryRunner.query).not.toHaveBeenCalled();
  });
});
