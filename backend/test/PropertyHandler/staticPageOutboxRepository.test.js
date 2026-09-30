import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { StaticPageOutboxRepository } from "../../functions/PropertyHandler/data/repository/staticPageOutboxRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

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

  it("lists the pending pages oldest first and maps the row to numbers", async () => {
    const client = buildClient([OUTBOX_ROW]);

    const pages = await new StaticPageOutboxRepository().listPendingPages({ limit: 10 });

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain("FROM main.static_page_outbox");
    expect(statement).toContain("WHERE status = $1");
    expect(statement).toContain("ORDER BY updated_at ASC");
    expect(parameters).toEqual(["PENDING", 10]);
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

    await new StaticPageOutboxRepository().listPendingPages({ limit: 5000 });

    expect(client.query.mock.calls[0][1]).toEqual(["PENDING", 200]);
  });

  it("reads an empty list when nothing is pending", async () => {
    buildClient([]);

    await expect(new StaticPageOutboxRepository().listPendingPages()).resolves.toEqual([]);
  });

  it("reads one site's queued page and reports null when the site has none", async () => {
    const client = buildClient([OUTBOX_ROW]);
    const repository = new StaticPageOutboxRepository();

    const page = await repository.getPageBySiteId("site-1");

    expect(client.query.mock.calls[0][1]).toEqual(["site-1"]);
    expect(page).toMatchObject({ siteId: "site-1", revision: 4, status: "PENDING" });

    buildClient([]);
    await expect(repository.getPageBySiteId("site-9")).resolves.toBeNull();
    await expect(repository.getPageBySiteId("  ")).rejects.toThrow("A site id is required.");
  });

  it("marks a page active only for the revision the caller rendered", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW });

    const [statement, parameters, useStructuredResult] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain("UPDATE main.static_page_outbox");
    expect(statement).toContain("WHERE site_id = $1");
    expect(statement).toContain("AND revision = $2");
    expect(parameters).toEqual(["site-1", 4, "ACTIVE", NOW]);
    expect(useStructuredResult).toBe(true);
    expect(client.queryRunner.release).toHaveBeenCalledTimes(1);
    expect(applied).toBe(true);
  });

  it("refuses to mark a page active when a newer publish has replaced the revision", async () => {
    buildClient([]);

    await expect(new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW })).resolves.toBe(false);
  });

  it("records a failure against the revision that failed and counts the attempt", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().markPageFailed("site-1", 4, "S3_PUT_FAILED", { now: NOW });

    const [statement, parameters] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain("attempt_count = attempt_count + 1");
    expect(statement).toContain("AND revision = $2");
    expect(statement).not.toContain("processed_at = $");
    expect(parameters).toEqual(["site-1", 4, "FAILED", "S3_PUT_FAILED", NOW]);
    expect(applied).toBe(true);
  });

  it("refuses to record a failure against a revision that is no longer the queued one", async () => {
    buildClient([]);

    await expect(
      new StaticPageOutboxRepository().markPageFailed("site-1", 4, "S3_PUT_FAILED", { now: NOW })
    ).resolves.toBe(false);
  });

  it("releases the query runner when a status write throws", async () => {
    const client = buildClient([]);
    client.queryRunner.query.mockRejectedValueOnce(new Error("connection lost"));

    await expect(new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW })).rejects.toThrow(
      "connection lost"
    );
    expect(client.queryRunner.release).toHaveBeenCalledTimes(1);
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
