import ChannexAriOutboxWorker from "../../.shared/channelManagement/services/channexAriOutboxWorker.js";

const NOW = 1_750_000_000_000;
const claimedRow = (overrides = {}) => ({
  id: "row-1",
  domitsPropertyId: "property-1",
  changeTypes: ["rates"],
  dateFrom: 20261101,
  dateTo: 20261101,
  ...overrides,
});
const sent = { statusCode: 200, response: { ready: true, overallSuccess: true, taskIds: ["task-1"], steps: [] } };
const channexDown = {
  statusCode: 500,
  response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 503, errorCode: "CHANNEX_DOWN" }] }] },
};

const createWorker = (overrides = {}) => {
  const outbox = {
    claim: jest.fn(async () => [claimedRow()]),
    markProcessed: jest.fn(async () => 1),
    markFailed: jest.fn(async () => 1),
    markSkipped: jest.fn(async () => 1),
    returnToPending: jest.fn(async () => 1),
  };
  const props = { listActiveByDomitsPropertyId: jest.fn(async () => [{ integrationAccountId: "account-1" }]) };
  const accounts = {
    getById: jest.fn(async () => ({ id: "account-1", userId: "owner-1", channel: "CHANNEX", status: "CONNECTED" })),
  };
  const sync = {
    tryAcquireLock: jest.fn(async () => ({ acquired: true })),
    releaseLock: jest.fn(async () => undefined),
  };
  const syncCalendarChange = jest.fn(async () => sent);
  const deps = { outbox, props, accounts, sync, syncCalendarChange, now: () => NOW, random: () => 0, log: { error: jest.fn() }, ...overrides };
  return { worker: new ChannexAriOutboxWorker(deps), ...deps };
};

describe("ChannexAriOutboxWorker.processProperty", () => {
  test("sends the claimed change as the account owner, with a timeout, and marks it PROCESSED", async () => {
    const { worker, syncCalendarChange, outbox } = createWorker();

    const outcome = await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(syncCalendarChange).toHaveBeenCalledWith(
      {
        userId: "owner-1",
        domitsPropertyId: "property-1",
        changeTypes: ["rates"],
        changedDates: ["2026-11-01"],
        source: "CHANNEX_ARI_OUTBOX",
      },
      { providerRequestTimeoutMs: 8000 }
    );
    expect(outbox.markProcessed).toHaveBeenCalledWith(["row-1"], { now: NOW, sentSummary: { taskIds: ["task-1"], calls: 1 } });
    expect(outcome).toBe("PROCESSED");
  });

  test("takes the per-property lock and always releases it", async () => {
    const { worker, sync } = createWorker();

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(sync.tryAcquireLock).toHaveBeenCalledWith("account-1", "channex_ari:property-1", {
      staleBeforeMs: NOW - 300_000,
    });
    expect(sync.releaseLock).toHaveBeenCalledWith("account-1", "channex_ari:property-1", { status: "IDLE" });
  });

  test("skips the property when another run holds the lock, and claims nothing", async () => {
    const { worker, sync, outbox } = createWorker();
    sync.tryAcquireLock.mockResolvedValue({ acquired: false });

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("LOCKED");
    expect(outbox.claim).not.toHaveBeenCalled();
  });

  test("treats a 40001 while locking as 'another run has it'", async () => {
    const { worker, sync } = createWorker();
    sync.tryAcquireLock.mockRejectedValue(Object.assign(new Error("conflict"), { code: "40001" }));

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("LOCKED");
  });

  test("marks the rows SKIPPED when the property is no longer mapped to Channex", async () => {
    const { worker, props, outbox, syncCalendarChange } = createWorker();
    props.listActiveByDomitsPropertyId.mockResolvedValue([]);

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("SKIPPED");
    expect(outbox.markSkipped).toHaveBeenCalledWith(["row-1"], { now: NOW, failureReason: "NOT_MAPPED" });
    expect(syncCalendarChange).not.toHaveBeenCalled();
  });

  test("ignores a mapping whose account is not a connected Channex account", async () => {
    const { worker, accounts } = createWorker();
    accounts.getById.mockResolvedValue({ id: "account-1", userId: "owner-1", channel: "HOLIDU", status: "CONNECTED" });

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("SKIPPED");
  });

  test("puts the rows back to PENDING on a temporary Channex problem", async () => {
    const { worker, syncCalendarChange, outbox } = createWorker();
    syncCalendarChange.mockResolvedValue({
      statusCode: 500,
      response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 429, errorCode: "CHANNEX_RATE_LIMITED" }] }] },
    });

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("RETRY");
    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-1"], { now: NOW, failureReason: "CHANNEX_RATE_LIMITED", nextAttemptAt: NOW + 60_000 });
  });

  test("marks the rows FAILED when Channex rejects the API key", async () => {
    const { worker, syncCalendarChange, outbox } = createWorker();
    syncCalendarChange.mockResolvedValue({
      statusCode: 500,
      response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 401, errorCode: "CHANNEX_UNAUTHORIZED" }] }] },
    });

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("FAILED");
    expect(outbox.markFailed).toHaveBeenCalledWith(["row-1"], { now: NOW, failureReason: "CHANNEX_UNAUTHORIZED" });
  });

  // The first call goes through and the second fails; only the row the first call
  // carried may be PROCESSED.
  test.each([
    ["a row of another call type", ["availability"], 20261101, ["restrictions"], 20261120],
    ["a row of the same type whose dates went in a later call", ["rates"], 20261101, ["rates"], 20280601],
  ])("records each row by the call that carried it: %s still retries", async (_, sentTypes, sentDate, laterTypes, laterDate) => {
    const { worker, syncCalendarChange, outbox } = createWorker();
    outbox.claim.mockResolvedValue([
      claimedRow({ id: "row-sent", changeTypes: sentTypes, dateFrom: sentDate, dateTo: sentDate }),
      claimedRow({ id: "row-later", changeTypes: laterTypes, dateFrom: laterDate, dateTo: laterDate }),
    ]);
    syncCalendarChange.mockResolvedValueOnce(sent).mockResolvedValueOnce(channexDown);

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("RETRY");
    expect(syncCalendarChange).toHaveBeenCalledTimes(2);
    expect(outbox.markProcessed).toHaveBeenCalledWith(["row-sent"], expect.objectContaining({ now: NOW }));
    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-later"], {
      now: NOW,
      failureReason: "CHANNEX_DOWN",
      nextAttemptAt: NOW + 60_000,
    });
  });

  test("keeps a row alive when one of its calls must be retried and another was rejected", async () => {
    const { worker, syncCalendarChange, outbox } = createWorker();
    // row-2 gives availability another date, so row-1's two types go out in two calls.
    outbox.claim.mockResolvedValue([
      claimedRow({ id: "row-1", changeTypes: ["availability", "rates"], dateFrom: 20261101, dateTo: 20261101 }),
      claimedRow({ id: "row-2", changeTypes: ["availability"], dateFrom: 20261105, dateTo: 20261105 }),
    ]);
    syncCalendarChange
      .mockResolvedValueOnce({
        statusCode: 500,
        response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 429, errorCode: "CHANNEX_RATE_LIMITED" }] }] },
      })
      .mockResolvedValueOnce({
        statusCode: 500,
        response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 400, errorCode: "CHANNEX_REJECTED" }] }] },
      });

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("RETRY");
    expect(syncCalendarChange).toHaveBeenCalledTimes(2);
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-1", "row-2"], expect.objectContaining({ now: NOW }));
  });

  test("stops sending further groups after the first non-PROCESSED result", async () => {
    const { worker, syncCalendarChange, outbox } = createWorker();
    outbox.claim.mockResolvedValue([
      claimedRow({ id: "row-1", changeTypes: ["rates"], dateFrom: 20261101, dateTo: 20261101 }),
      claimedRow({ id: "row-2", changeTypes: ["restrictions"], dateFrom: 20261120, dateTo: 20261120 }),
    ]);
    syncCalendarChange.mockResolvedValue(channexDown);

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("RETRY");
    expect(syncCalendarChange).toHaveBeenCalledTimes(1);
    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-1", "row-2"], { now: NOW, failureReason: "CHANNEX_DOWN", nextAttemptAt: NOW + 60_000 });
  });

  test("an unexpected error puts the claimed rows back and still releases the lock", async () => {
    const { worker, syncCalendarChange, outbox, sync } = createWorker();
    syncCalendarChange.mockRejectedValue(new Error("boom"));

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).rejects.toThrow("boom");
    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-1"], { now: NOW, failureReason: "UNEXPECTED_ERROR" });
    expect(sync.releaseLock).toHaveBeenCalled();
  });

  test("returns EMPTY when another run claimed the rows first", async () => {
    const { worker, outbox, syncCalendarChange } = createWorker();
    outbox.claim.mockResolvedValue([]);

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe("EMPTY");
    expect(syncCalendarChange).not.toHaveBeenCalled();
  });
});
