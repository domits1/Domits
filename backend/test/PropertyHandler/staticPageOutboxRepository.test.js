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
    const client = buildClient([{ ...OUTBOX_ROW, status: "FAILED", failure_reason: "S3_PUT_FAILED", attempt_count: 1 }]);

    const pages = await new StaticPageOutboxRepository().listPagesToBuild();

    expect(client.query.mock.calls[0][0]).toContain("WHERE status = ANY($1)");
    expect(client.query.mock.calls[0][1][0]).toEqual(["PENDING", "FAILED"]);
    expect(pages).toEqual([
      expect.objectContaining({ siteId: "site-1", status: "FAILED", failureReason: "S3_PUT_FAILED", attemptCount: 1 }),
    ]);
  });

  it("leaves a page that is already active alone", async () => {
    const client = buildClient([]);

    await new StaticPageOutboxRepository().listPagesToBuild();

    expect(client.query.mock.calls[0][1][0]).not.toContain("ACTIVE");
  });

  it("lists the pages oldest first and maps the row to numbers", async () => {
    const client = buildClient([OUTBOX_ROW]);

    const pages = await new StaticPageOutboxRepository().listPagesToBuild({ limit: 10 });

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain(`FROM ${SCHEMA}.static_page_outbox`);
    expect(statement).toContain("WHERE status = ANY($1)");
    expect(statement).toContain("ORDER BY updated_at ASC");
    expect(parameters).toEqual([["PENDING", "FAILED"], 10]);
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

    await new StaticPageOutboxRepository().listPagesToBuild({ limit: 5000 });

    expect(client.query.mock.calls[0][1]).toEqual([["PENDING", "FAILED"], 200]);
  });

  it("reads an empty list when nothing is pending", async () => {
    buildClient([]);

    await expect(new StaticPageOutboxRepository().listPagesToBuild()).resolves.toEqual([]);
  });

  it("marks a page active only for the revision the caller rendered", async () => {
    const client = buildClient([{ site_id: "site-1" }]);

    const applied = await new StaticPageOutboxRepository().markPageActive("site-1", 4, { now: NOW });

    const [statement, parameters, useStructuredResult] = client.queryRunner.query.mock.calls[0];
    expect(statement).toContain(`UPDATE ${SCHEMA}.static_page_outbox`);
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
