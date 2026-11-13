import ChannexHealthService from "../../.shared/channelManagement/services/channexHealthService.js";
import { HEALTH_REASON, HEALTH_STATUS } from "../../.shared/channelManagement/utils/channexHealthStatus.js";

const NOW = 1_794_307_261_992;

const outboxSummary = {
  pending: 0,
  processing: 0,
  oldestPendingCreatedAt: null,
  failedLast24Hours: 0,
  failedLast7Days: 0,
  processedLast7Days: 31,
  recentFailures: [],
};
const alarmItems = [{ name: "channex-outbox-rows-failed", state: "OK", updatedAt: NOW - 1000 }];
const accounts = [
  { id: "account-1", displayName: "Villa host", status: "CONNECTED", lastErrorCode: null, mappedProperties: 1 },
];

const buildService = ({ readAlarms = async () => alarmItems, log = { warn: jest.fn() } } = {}) => {
  const service = new ChannexHealthService({
    outbox: { healthSummary: jest.fn(async () => outboxSummary) },
    healthRepository: {
      lastRevisionAt: jest.fn(async () => NOW - 2000),
      lastPoll: jest.fn(async () => ({ lastPollAt: NOW - 3000, lastPollStatus: "SUCCESS" })),
      accounts: jest.fn(async () => accounts),
    },
    alarmReader: { readAlarms: jest.fn(readAlarms) },
    now: () => NOW,
    log,
  });
  return { service, log };
};

describe("ChannexHealthService.getHealth (design note section 6)", () => {
  test("puts the database numbers, the alarm states and the status into one answer", async () => {
    const { service } = buildService();

    await expect(service.getHealth()).resolves.toEqual({
      generatedAt: NOW,
      status: HEALTH_STATUS.HEALTHY,
      reasons: [],
      outbox: outboxSummary,
      bookings: { lastRevisionAt: NOW - 2000, lastPollAt: NOW - 3000, lastPollStatus: "SUCCESS" },
      alarms: { available: true, items: alarmItems },
      accounts,
    });
  });

  // D4: a CloudWatch failure must not take the database part down with it.
  test("still answers with the database part when CloudWatch fails, and says the alarms are unavailable", async () => {
    const error = Object.assign(new Error("not authorized"), { name: "AccessDeniedException" });
    const { service } = buildService({ readAlarms: async () => Promise.reject(error) });

    const health = await service.getHealth();

    expect(health.alarms).toEqual({ available: false, reason: "AccessDeniedException", items: [] });
    expect(health.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(health.reasons).toEqual([{ code: HEALTH_REASON.ALARMS_UNAVAILABLE }]);
    expect(health.outbox).toEqual(outboxSummary);
    expect(health.accounts).toEqual(accounts);
  });

  // Not swallowed: one JSON line, so the failure is findable in the ChannelManagement logs.
  test("logs the CloudWatch failure as one JSON line", async () => {
    const error = Object.assign(new Error("not authorized"), { name: "AccessDeniedException" });
    const { service, log } = buildService({ readAlarms: async () => Promise.reject(error) });

    await service.getHealth();

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.warn.mock.calls[0][0])).toEqual({
      event: "CHANNEX_HEALTH_ALARMS_UNAVAILABLE",
      error: "AccessDeniedException",
    });
  });

  // A hanging CloudWatch call would otherwise run into API Gateway's 29 s limit and lose the database part too.
  test("gives up on the alarms after three seconds and still answers", async () => {
    jest.useFakeTimers();
    try {
      const { service, log } = buildService({ readAlarms: () => new Promise(() => {}) });

      const answer = service.getHealth();
      await jest.advanceTimersByTimeAsync(3000);
      const health = await answer;

      expect(health.alarms).toEqual({ available: false, reason: "TIMEOUT", items: [] });
      expect(health.outbox).toEqual(outboxSummary);
      expect(JSON.parse(log.warn.mock.calls[0][0])).toEqual({
        event: "CHANNEX_HEALTH_ALARMS_UNAVAILABLE",
        error: "TIMEOUT",
      });
    } finally {
      jest.useRealTimers();
    }
  });

  // Without the database numbers the page has nothing true to show, so the request fails.
  test("fails when a database read fails", async () => {
    const { service } = buildService();
    service.outbox.healthSummary.mockRejectedValue(new Error("DSQL timeout"));

    await expect(service.getHealth()).rejects.toThrow("DSQL timeout");
  });
});
