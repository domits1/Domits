const MINUTE_MS = 60 * 1000;

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const REASON_SENTENCES = {
  CRITICAL_ALARM: ({ alarm }) => `Critical alarm: ${alarm}`,
  WARNING_ALARM: ({ alarm }) => `Warning alarm: ${alarm}`,
  ALARMS_UNAVAILABLE: () => "Alarm states could not be read",
  ALARM_MISSING: ({ alarm }) => `Alarm not found in CloudWatch: ${alarm}`,
  FAILED_CHANGES: ({ count }) => `${plural(count, "failed change", "failed changes")} in the last 24 hours`,
  STUCK_QUEUE: ({ waitingMs }) => `Oldest change waiting ${Math.floor(waitingMs / MINUTE_MS)} min`,
  RECONNECT_REQUIRED: ({ count }) => `${plural(count, "account needs", "accounts need")} to reconnect`,
  POLL_FAILED: () => "Last booking poll failed",
};

export const STATUS_LABELS = { HEALTHY: "Healthy", DEGRADED: "Degraded", DOWN: "Down" };

export const formatDateTime = (time) =>
  new Date(time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// An unknown code stays visible: a health page must not hide a reason the backend added later.
export const describeReason = (reason) => REASON_SENTENCES[reason.code]?.(reason) ?? reason.code;
