jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { NOW, mockClient } from "./support/outboxTestSupport.js";

describe("recording the outcome of a push", () => {
  let client;
  let repository;

  beforeEach(() => {
    client = mockClient([{ id: "row-1" }]);
    repository = new ChannexAriOutboxRepository();
  });

  test("marks rows PROCESSED with the summary and the time they were sent", async () => {
    const changed = await repository.markProcessed(["row-1"], {
      now: NOW,
      sentSummary: { taskIds: ["task-1"], httpStatus: 200 },
    });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("processedat");
    expect(sql).toContain("COALESCE");
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

  test("returns rows to PENDING with the time they may be tried again", async () => {
    await repository.returnToPending(["row-1"], {
      now: NOW,
      failureReason: "CHANNEX_429",
      nextAttemptAt: NOW + 60_000,
    });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("PENDING");
    expect(params).toContain(NOW + 60_000);
  });

  test("only touches rows this run still holds, so a recovered run cannot overwrite a later one", async () => {
    await repository.markProcessed(["row-1"], { now: NOW });
    await repository.markFailed(["row-1"], { now: NOW });
    await repository.returnToPending(["row-1"], { now: NOW });

    for (const call of client.query.mock.calls) {
      expect(call[0]).toContain("AND status = $7");
      expect(call[1][6]).toBe("PROCESSING");
    }
  });

  test("skipping is not guarded, because unmapped rows are skipped before they are claimed", async () => {
    await repository.markSkipped(["row-1"], { now: NOW, failureReason: "NOT_MAPPED" });

    const [sql, params] = client.query.mock.calls[0];
    expect(params[0]).toBe("SKIPPED");
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
