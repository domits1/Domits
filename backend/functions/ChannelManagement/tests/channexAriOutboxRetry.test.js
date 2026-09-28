import { parseRetryAfterMs } from "../../.shared/channelManagement/providers/channex/providerClient.js";
import { formatChannexRestrictionProviderResult } from "../../.shared/channelManagement/utils/channexAriExecutionUtils.js";
import {
  OUTCOME,
  classifySyncResponse,
  nextRetryDelayMs,
} from "../../.shared/channelManagement/utils/channexAriOutboxPlanning.js";
import ChannexAriOutboxWorker from "../../.shared/channelManagement/services/channexAriOutboxWorker.js";

const MINUTE = 60_000;
const NOW = 1_750_000_000_000;

describe("parseRetryAfterMs", () => {
  test("reads seconds", () => {
    expect(parseRetryAfterMs("30")).toBe(30_000);
  });

  test("reads an HTTP date as the time left until then", () => {
    expect(parseRetryAfterMs("Wed, 21 Oct 2026 07:28:30 GMT", Date.parse("Wed, 21 Oct 2026 07:28:00 GMT"))).toBe(30_000);
  });

  test("ignores a missing or unreadable value", () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs("soon")).toBeNull();
  });
});

describe("the result formatter", () => {
  test("keeps Channex's Retry-After so the worker can see it", () => {
    expect(formatChannexRestrictionProviderResult({ httpStatus: 429, retryAfterMs: 30_000 }).retryAfterMs).toBe(30_000);
  });
});

describe("nextRetryDelayMs", () => {
  test("doubles from one minute: 1, 2, 4, 8, 16, 32", () => {
    expect([1, 2, 3, 4, 5, 6].map((attempt) => nextRetryDelayMs(attempt, () => 0))).toEqual(
      [1, 2, 4, 8, 16, 32].map((minutes) => minutes * MINUTE)
    );
  });

  test("never waits longer than 60 minutes", () => {
    expect(nextRetryDelayMs(7, () => 0)).toBe(60 * MINUTE);
    expect(nextRetryDelayMs(20, () => 0)).toBe(60 * MINUTE);
  });

  test("adds up to 10% jitter so properties do not all retry in the same second", () => {
    expect(nextRetryDelayMs(1, () => 1)).toBe(66_000);
  });
});

describe("classifySyncResponse", () => {
  test("passes Channex's Retry-After along with a retry", () => {
    const result = classifySyncResponse({
      statusCode: 500,
      response: { ready: true, steps: [{ results: [{ success: false, httpStatus: 429, retryAfterMs: 30_000 }] }] },
    });

    expect(result).toMatchObject({ outcome: OUTCOME.RETRY, retryAfterMs: 30_000 });
  });
});

describe("the worker on a retry", () => {
  const rateLimited = (retryAfterMs = null) => ({
    statusCode: 500,
    response: {
      ready: true,
      steps: [{ results: [{ success: false, httpStatus: 429, errorCode: "CHANNEX_RATE_LIMITED", retryAfterMs }] }],
    },
  });

  const createWorker = (attemptCount, answer) => {
    const outbox = {
      claim: jest.fn(async () => [
        { id: "row-1", domitsPropertyId: "property-1", changeTypes: ["rates"], dateFrom: 20261101, dateTo: 20261101, attemptCount },
      ]),
      returnToPending: jest.fn(async () => 1),
      markFailed: jest.fn(async () => 1),
    };
    const worker = new ChannexAriOutboxWorker({
      outbox,
      props: { listActiveByDomitsPropertyId: async () => [{ integrationAccountId: "account-1" }] },
      accounts: { getById: async () => ({ id: "account-1", userId: "owner-1", channel: "CHANNEX", status: "CONNECTED" }) },
      sync: { tryAcquireLock: async () => ({ acquired: true }), releaseLock: async () => undefined },
      syncCalendarChange: async () => answer,
      now: () => NOW,
      random: () => 0,
      log: { error: jest.fn() },
    });
    return { worker, outbox };
  };

  test("waits longer after each attempt", async () => {
    const { worker, outbox } = createWorker(3, rateLimited());

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(outbox.returnToPending).toHaveBeenCalledWith(["row-1"], {
      now: NOW,
      failureReason: "CHANNEX_RATE_LIMITED",
      nextAttemptAt: NOW + 4 * MINUTE,
    });
  });

  test("uses Channex's Retry-After instead of its own delay", async () => {
    const { worker, outbox } = createWorker(1, rateLimited(30_000));

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(outbox.returnToPending.mock.calls[0][1].nextAttemptAt).toBe(NOW + 30_000);
  });

  test("gives up after 8 attempts, so a change that keeps failing becomes visible", async () => {
    const { worker, outbox } = createWorker(8, rateLimited());

    await expect(worker.processProperty("property-1", { runStartedAt: NOW })).resolves.toBe(OUTCOME.FAILED);
    expect(outbox.markFailed).toHaveBeenCalledWith(["row-1"], { now: NOW, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
    expect(outbox.returnToPending).not.toHaveBeenCalled();
  });
});

describe("retry per call type and per row (#3280 review)", () => {
  const answerWith = (httpStatus, retryAfterMs = null) =>
    httpStatus === 200
      ? { statusCode: 200, response: { ready: true, overallSuccess: true, taskIds: ["task-1"], steps: [] } }
      : {
          statusCode: 500,
          response: {
            ready: true,
            steps: [{ results: [{ success: false, httpStatus, errorCode: `CHANNEX_${httpStatus}`, retryAfterMs }] }],
          },
        };

  const createWorker = (rows, answers) => {
    const outbox = {
      claim: jest.fn(async () => rows),
      markProcessed: jest.fn(async () => 1),
      markFailed: jest.fn(async () => 1),
      returnToPending: jest.fn(async () => 1),
    };
    const syncCalendarChange = jest.fn();
    answers.forEach((answer) => syncCalendarChange.mockResolvedValueOnce(answer));
    const worker = new ChannexAriOutboxWorker({
      outbox,
      props: { listActiveByDomitsPropertyId: async () => [{ integrationAccountId: "account-1" }] },
      accounts: { getById: async () => ({ id: "account-1", userId: "owner-1", channel: "CHANNEX", status: "CONNECTED" }) },
      sync: { tryAcquireLock: async () => ({ acquired: true }), releaseLock: async () => undefined },
      syncCalendarChange,
      now: () => NOW,
      random: () => 0,
      log: { error: jest.fn() },
    });
    return { worker, outbox, syncCalendarChange };
  };
  const row = (id, changeTypes, date, attemptCount = 1) => ({
    id,
    domitsPropertyId: "property-1",
    changeTypes,
    dateFrom: date,
    dateTo: date,
    attemptCount,
  });

  test("a 429 on prices holds back further price and restriction calls, but availability still goes out", async () => {
    const { worker, outbox, syncCalendarChange } = createWorker(
      [row("availability-1", ["availability"], 20261101), row("rates-1", ["rates"], 20261102), row("restrictions-1", ["restrictions"], 20261103)],
      [answerWith(200), answerWith(429)]
    );

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(syncCalendarChange).toHaveBeenCalledTimes(2);
    expect(outbox.markProcessed).toHaveBeenCalledWith(["availability-1"], expect.anything());
    expect(outbox.returnToPending).toHaveBeenCalledWith(["rates-1", "restrictions-1"], expect.anything());
  });

  test("only the row that used up its attempts fails; a fresh row in the same call keeps retrying", async () => {
    const { worker, outbox } = createWorker(
      [row("old", ["rates"], 20261101, 8), row("fresh", ["rates"], 20261101, 1)],
      [answerWith(503)]
    );

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(outbox.markFailed).toHaveBeenCalledWith(["old"], { now: NOW, failureReason: "MAX_ATTEMPTS_EXCEEDED" });
    expect(outbox.returnToPending).toHaveBeenCalledWith(["fresh"], expect.objectContaining({ nextAttemptAt: NOW + MINUTE }));
  });

  test("a huge Retry-After is capped at 60 minutes", async () => {
    const { worker, outbox } = createWorker([row("rates-1", ["rates"], 20261101)], [answerWith(429, 86_400_000)]);

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(outbox.returnToPending.mock.calls[0][1].nextAttemptAt).toBe(NOW + 60 * MINUTE);
  });

  test("a Retry-After of 0 falls back to our own delay instead of no wait at all", async () => {
    const { worker, outbox } = createWorker([row("rates-1", ["rates"], 20261101)], [answerWith(429, 0)]);

    await worker.processProperty("property-1", { runStartedAt: NOW });

    expect(outbox.returnToPending.mock.calls[0][1].nextAttemptAt).toBe(NOW + MINUTE);
  });
});
