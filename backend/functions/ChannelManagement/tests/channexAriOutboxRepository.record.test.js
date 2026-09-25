jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";

const NOW = 1_750_000_000_000;

describe("recording the outcome of a push", () => {
  let client;
  let repository;

  beforeEach(() => {
    client = { options: { schema: "main" }, query: jest.fn(async () => [{ id: "row-1" }]) };
    Database.getInstance.mockResolvedValue(client);
    repository = new ChannexAriOutboxRepository();
  });

  test("marks rows PROCESSED with the summary and the time they were sent", async () => {
    const changed = await repository.markProcessed(["row-1"], {
      now: NOW,
      sentSummary: { taskIds: ["task-1"], httpStatus: 200 },
    });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("processedat");
    expect(params[0]).toBe("PROCESSED");
    expect(params).toContain(JSON.stringify({ taskIds: ["task-1"], httpStatus: 200 }));
    expect(changed).toBe(1);
  });

  test("marks rows FAILED with a reason and leaves processedat untouched", async () => {
    await repository.markFailed(["row-1"], { now: NOW, failureReason: "CHANNEX_401" });

    const [sql, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("FAILED");
    expect(params).toContain("CHANNEX_401");
    expect(sql).not.toContain("processedat");
  });

  test("marks rows SKIPPED when the property is no longer mapped to Channex", async () => {
    await repository.markSkipped(["row-1"], { now: NOW, failureReason: "NOT_MAPPED" });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("SKIPPED");
    expect(params).toContain("NOT_MAPPED");
  });

  test("returns rows to PENDING with the time they may be tried again", async () => {
    await repository.returnToPending(["row-1"], {
      now: NOW,
      failureReason: "CHANNEX_429",
      nextAttemptAt: NOW + 60_000,
    });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("PENDING");
    expect(params).toContain(NOW + 60_000);
    expect(params).toContain("CHANNEX_429");
  });

  test("returning to PENDING without a retry time leaves the row ready straight away", async () => {
    await repository.returnToPending(["row-1"], { now: NOW, failureReason: "UNEXPECTED_ERROR" });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("PENDING");
    expect(params).toContain(null);
  });

  test("keeps an existing summary when a later call passes none", async () => {
    await repository.markFailed(["row-1"], { now: NOW, failureReason: "CHANNEX_500" });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain("COALESCE");
  });

  test("changes several rows in one statement, since a run claims a batch per property", async () => {
    client.query.mockResolvedValueOnce([{ id: "row-1" }, { id: "row-2" }, { id: "row-3" }]);

    const changed = await repository.markProcessed(["row-1", "row-2", "row-3"], { now: NOW });

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(changed).toBe(3);
  });

  test("only touches rows this run still holds, so a recovered run cannot overwrite a later one", async () => {
    await repository.markProcessed(["row-1"], { now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("AND status = $7");
    expect(params[6]).toBe("PROCESSING");
  });

  test("failing and retrying are guarded the same way", async () => {
    await repository.markFailed(["row-1"], { now: NOW, failureReason: "CHANNEX_400" });
    await repository.returnToPending(["row-1"], { now: NOW, nextAttemptAt: NOW + 60_000 });

    expect(client.query.mock.calls[0][1][6]).toBe("PROCESSING");
    expect(client.query.mock.calls[1][1][6]).toBe("PROCESSING");
  });

  test("skipping is not guarded, because unmapped rows are skipped before they are claimed", async () => {
    await repository.markSkipped(["row-1"], { now: NOW, failureReason: "NOT_MAPPED" });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).not.toContain("AND status =");
    expect(params).toHaveLength(6);
  });

  test("does nothing and asks the database nothing when the id list is empty", async () => {
    await expect(repository.markProcessed([], { now: NOW })).resolves.toBe(0);
    await expect(repository.markFailed([], { now: NOW })).resolves.toBe(0);
    await expect(repository.returnToPending([], { now: NOW })).resolves.toBe(0);
    expect(client.query).not.toHaveBeenCalled();
  });
});
