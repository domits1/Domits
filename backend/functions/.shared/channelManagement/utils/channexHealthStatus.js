import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import { CHANNEX_ARI_OUTBOX_DEFAULTS } from "./channexAriOutboxConstants.js";

// The health rule of the Channex health view (design note D5,
// docs/partner/integrations/channel_manager/channex/channex_health_dashboard_design.md).

export const HEALTH_STATUS = Object.freeze({
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  DOWN: "DOWN",
});

export const HEALTH_REASON = Object.freeze({
  CRITICAL_ALARM: "CRITICAL_ALARM",
  WARNING_ALARM: "WARNING_ALARM",
  ALARMS_UNAVAILABLE: "ALARMS_UNAVAILABLE",
  ALARM_MISSING: "ALARM_MISSING",
  FAILED_CHANGES: "FAILED_CHANGES",
  STUCK_QUEUE: "STUCK_QUEUE",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  POLL_FAILED: "POLL_FAILED",
});

// CloudWatch's own states, plus MISSING for an alarm on the list that CloudWatch no
// longer has. The reader sets MISSING and the rule reads it, so both use this one value.
export const ALARM_STATE = Object.freeze({
  OK: "OK",
  ALARM: "ALARM",
  MISSING: "MISSING",
});

export const ALARM_SEVERITY = Object.freeze({
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
});

// The one list of alarms the health view reads, so the CloudWatch reader and this rule
// cannot drift apart. An alarm is critical when a change or a booking can really be lost.
// The warnings lose nothing: a rejected webhook is usually a probe, and a throttled
// webhook gets a 5xx that Channex retries. An alarm not in this list counts as a warning.
export const CHANNEX_HEALTH_ALARMS = Object.freeze([
  { name: "channex-outbox-rows-failed", severity: ALARM_SEVERITY.CRITICAL },
  { name: "channex-webhook-errors", severity: ALARM_SEVERITY.CRITICAL },
  { name: "channex-webhook-missed", severity: ALARM_SEVERITY.CRITICAL },
  { name: "channex-reconnect-required", severity: ALARM_SEVERITY.CRITICAL },
  { name: "channelmanagement-errors", severity: ALARM_SEVERITY.CRITICAL },
  { name: "channex-webhook-rejected", severity: ALARM_SEVERITY.WARNING },
  { name: "channelmanagement-throttles", severity: ALARM_SEVERITY.WARNING },
]);

const CRITICAL_ALARMS = new Set(
  CHANNEX_HEALTH_ALARMS.filter((alarm) => alarm.severity === ALARM_SEVERITY.CRITICAL).map((alarm) => alarm.name)
);

const WORKER_INTERVAL_MS = 60_000;
// The worker may hold a change for CAP_MS while a host keeps saving, and runs once a
// minute, so only a change waiting longer than that is stuck or in back-off.
export const STUCK_QUEUE_MS = CHANNEX_ARI_OUTBOX_DEFAULTS.CAP_MS + 2 * WORKER_INTERVAL_MS;

const alarmReasons = (alarms) => {
  if (!alarms?.available) return [{ code: HEALTH_REASON.ALARMS_UNAVAILABLE }];

  return (alarms.items || []).flatMap((alarm) => {
    // A deleted alarm cannot fire any more, so its failure would go unnoticed.
    if (alarm.state === ALARM_STATE.MISSING) return [{ code: HEALTH_REASON.ALARM_MISSING, alarm: alarm.name }];
    if (alarm.state !== ALARM_STATE.ALARM) return [];
    const code = CRITICAL_ALARMS.has(alarm.name) ? HEALTH_REASON.CRITICAL_ALARM : HEALTH_REASON.WARNING_ALARM;
    return [{ code, alarm: alarm.name }];
  });
};

const outboxReasons = (outbox, now) => {
  const reasons = [];
  if (outbox.failedLast24Hours > 0) {
    reasons.push({ code: HEALTH_REASON.FAILED_CHANGES, count: outbox.failedLast24Hours });
  }
  // Only a real time means a change is waiting; without this check, now - undefined is NaN,
  // which silently compares as "not stuck".
  const oldest = outbox.oldestPendingCreatedAt;
  const waitingMs = Number.isFinite(oldest) ? now - oldest : 0;
  if (waitingMs > STUCK_QUEUE_MS) {
    reasons.push({ code: HEALTH_REASON.STUCK_QUEUE, waitingMs });
  }
  return reasons;
};

const accountReasons = (accounts) => {
  const count = accounts.filter((account) => account.status === CHANNEX_STATUS.RECONNECT_REQUIRED).length;
  return count > 0 ? [{ code: HEALTH_REASON.RECONNECT_REQUIRED, count }] : [];
};

const pollReasons = (bookings) => (bookings.lastPollStatus === "FAILED" ? [{ code: HEALTH_REASON.POLL_FAILED }] : []);

export const evaluateChannexHealth = ({ now, outbox, bookings, alarms, accounts }) => {
  const reasons = [
    ...alarmReasons(alarms),
    ...outboxReasons(outbox, now),
    ...accountReasons(accounts),
    ...pollReasons(bookings),
  ];

  const isDown = reasons.some((reason) => reason.code === HEALTH_REASON.CRITICAL_ALARM);
  let status = HEALTH_STATUS.HEALTHY;
  if (isDown) status = HEALTH_STATUS.DOWN;
  else if (reasons.length > 0) status = HEALTH_STATUS.DEGRADED;

  return { status, reasons };
};
