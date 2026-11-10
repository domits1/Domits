import {
  ALARM_SEVERITY,
  CHANNEX_HEALTH_ALARMS,
  HEALTH_REASON,
  HEALTH_STATUS,
  STUCK_QUEUE_MS,
  evaluateChannexHealth,
} from "../../.shared/channelManagement/utils/channexHealthStatus.js";
import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "../../.shared/channelManagement/utils/channexAriOutboxConstants.js";

const NOW = Date.UTC(2026, 10, 10, 12);
const MINUTE = 60_000;

// Everything fine: no waiting change, nothing failed, polling worked, all alarms OK, one connected account.
const healthy = () => ({
  now: NOW,
  outbox: { oldestPendingCreatedAt: null, failedLast24Hours: 0 },
  bookings: { lastPollStatus: "SUCCESS" },
  alarms: {
    available: true,
    items: [
      { name: "channex-outbox-rows-failed", state: "OK" },
      { name: "channex-webhook-rejected", state: "OK" },
      { name: "channelmanagement-throttles", state: "OK" },
    ],
  },
  accounts: [{ status: "CONNECTED" }],
});

const withAlarm = (name, state) => {
  const input = healthy();
  input.alarms.items = input.alarms.items.map((alarm) => (alarm.name === name ? { ...alarm, state } : alarm));
  return input;
};

// The seven alarms from #3620, with the severity from the design note's alarm table.
describe("CHANNEX_HEALTH_ALARMS", () => {
  test("lists the seven channel manager alarms with their severity", () => {
    expect(CHANNEX_HEALTH_ALARMS).toEqual([
      { name: "channex-outbox-rows-failed", severity: ALARM_SEVERITY.CRITICAL },
      { name: "channex-webhook-errors", severity: ALARM_SEVERITY.CRITICAL },
      { name: "channex-webhook-missed", severity: ALARM_SEVERITY.CRITICAL },
      { name: "channex-reconnect-required", severity: ALARM_SEVERITY.CRITICAL },
      { name: "channelmanagement-errors", severity: ALARM_SEVERITY.CRITICAL },
      { name: "channex-webhook-rejected", severity: ALARM_SEVERITY.WARNING },
      { name: "channelmanagement-throttles", severity: ALARM_SEVERITY.WARNING },
    ]);
  });

  test("an alarm outside the list only counts as a warning", () => {
    const input = healthy();
    input.alarms.items.push({ name: "some-new-alarm", state: "ALARM" });

    expect(evaluateChannexHealth(input).status).toBe(HEALTH_STATUS.DEGRADED);
  });
});

describe("evaluateChannexHealth (design note D5)", () => {
  test("is HEALTHY when nothing is wrong", () => {
    expect(evaluateChannexHealth(healthy())).toEqual({ status: HEALTH_STATUS.HEALTHY, reasons: [] });
  });

  test("is DOWN when a critical alarm fires", () => {
    const result = evaluateChannexHealth(withAlarm("channex-outbox-rows-failed", "ALARM"));

    expect(result.status).toBe(HEALTH_STATUS.DOWN);
    expect(result.reasons).toEqual([{ code: HEALTH_REASON.CRITICAL_ALARM, alarm: "channex-outbox-rows-failed" }]);
  });

  // A probe on the webhook URL fires this alarm; it must not turn the page to Down.
  test.each(["channex-webhook-rejected", "channelmanagement-throttles"])(
    "is only DEGRADED when the warning alarm %s fires",
    (name) => {
      const result = evaluateChannexHealth(withAlarm(name, "ALARM"));

      expect(result.status).toBe(HEALTH_STATUS.DEGRADED);
      expect(result.reasons).toEqual([{ code: HEALTH_REASON.WARNING_ALARM, alarm: name }]);
    }
  );

  test.each([
    [
      "a change failed in the last 24 hours",
      (input) => (input.outbox.failedLast24Hours = 1),
      { code: HEALTH_REASON.FAILED_CHANGES, count: 1 },
    ],
    [
      "the oldest waiting change is older than the threshold",
      (input) => (input.outbox.oldestPendingCreatedAt = NOW - STUCK_QUEUE_MS - 1),
      { code: HEALTH_REASON.STUCK_QUEUE, waitingMs: STUCK_QUEUE_MS + 1 },
    ],
    [
      "an account must be reconnected",
      (input) => input.accounts.push({ status: "RECONNECT_REQUIRED" }),
      { code: HEALTH_REASON.RECONNECT_REQUIRED, count: 1 },
    ],
    [
      "the last polling run failed",
      (input) => (input.bookings.lastPollStatus = "FAILED"),
      { code: HEALTH_REASON.POLL_FAILED },
    ],
    [
      "the alarms could not be read",
      (input) => (input.alarms = { available: false, items: [] }),
      { code: HEALTH_REASON.ALARMS_UNAVAILABLE },
    ],
  ])("is DEGRADED when %s", (_label, breakIt, reason) => {
    const input = healthy();
    breakIt(input);

    expect(evaluateChannexHealth(input)).toEqual({ status: HEALTH_STATUS.DEGRADED, reasons: [reason] });
  });

  // The worker may hold a change for CAP_MS while a host keeps saving, so waiting that long is normal.
  test("a change waiting exactly the threshold is not stuck yet", () => {
    const input = healthy();
    input.outbox.oldestPendingCreatedAt = NOW - STUCK_QUEUE_MS;

    expect(evaluateChannexHealth(input).status).toBe(HEALTH_STATUS.HEALTHY);
  });

  test("an outbox without a waiting change is not stuck, whether the time is null or missing", () => {
    const input = healthy();
    delete input.outbox.oldestPendingCreatedAt;

    expect(evaluateChannexHealth(input).status).toBe(HEALTH_STATUS.HEALTHY);
  });

  test("the stuck-queue threshold is the worker's cap plus two runs of one minute", () => {
    expect(STUCK_QUEUE_MS).toBe(CHANNEX_ARI_OUTBOX_DEFAULTS.CAP_MS + 2 * MINUTE);
  });

  test("DOWN wins over DEGRADED and every reason is listed", () => {
    const input = withAlarm("channex-outbox-rows-failed", "ALARM");
    input.bookings.lastPollStatus = "FAILED";

    expect(evaluateChannexHealth(input)).toEqual({
      status: HEALTH_STATUS.DOWN,
      reasons: [
        { code: HEALTH_REASON.CRITICAL_ALARM, alarm: "channex-outbox-rows-failed" },
        { code: HEALTH_REASON.POLL_FAILED },
      ],
    });
  });
});
