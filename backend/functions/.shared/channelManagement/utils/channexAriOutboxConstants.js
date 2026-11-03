export const CHANNEX_ARI_OUTBOX_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
});

export const CHANNEX_ARI_OUTBOX_KIND = Object.freeze({
  CHANGE: "CHANGE",
  FULL_SYNC: "FULL_SYNC",
});

export const CHANNEX_ARI_OUTBOX_SOURCE = Object.freeze({
  CALENDAR: "CALENDAR",
  GLOBAL_SETTINGS: "GLOBAL_SETTINGS",
  BOOKING: "BOOKING",
  CHANNEX_IMPORT: "CHANNEX_IMPORT",
  // A full sync after a mapping is saved and ready: the property goes live, or recovers (#3282).
  GO_LIVE: "GO_LIVE",
});

// Lowercase, because these values go to Channex in the payload, not into our own column.
export const CHANNEX_ARI_CHANGE_TYPE = Object.freeze({
  AVAILABILITY: "availability",
  RATES: "rates",
  RESTRICTIONS: "restrictions",
});

// A booking closes dates, and every minute those dates stay open on the other
// channels is a double-booking risk, so these sources skip the quiet period (D3).
export const URGENT_SOURCES = Object.freeze([
  CHANNEX_ARI_OUTBOX_SOURCE.BOOKING,
  CHANNEX_ARI_OUTBOX_SOURCE.CHANNEX_IMPORT,
]);

export const CHANNEX_ARI_OUTBOX_DEFAULTS = Object.freeze({
  // Wait for a host to stop saving, so month-by-month edits merge into one call (D3).
  QUIET_MS: 60_000,
  // But never longer than this after the oldest waiting row, so a host who keeps
  // saving does not starve the queue.
  CAP_MS: 300_000,
  // A PROCESSING row untouched for this long belongs to a crashed run.
  STALE_PROCESSING_MS: 300_000,
  // Aurora DSQL refuses a transaction that changes more than 3,000 rows.
  CLEANUP_BATCH: 1_000,
  PROCESSED_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
  FAILED_RETENTION_MS: 90 * 24 * 60 * 60 * 1000,
  // Without a timeout a hanging Channex call outlives the Lambda and leaves the
  // lock and the claimed rows stuck until stale recovery.
  PROVIDER_REQUEST_TIMEOUT_MS: 8_000,
  // Retry delay doubles from one minute and is capped at an hour (#3280); after
  // MAX_ATTEMPTS the rows become FAILED so a change that keeps failing is visible.
  RETRY_BASE_MS: 60_000,
  RETRY_CAP_MS: 60 * 60 * 1000,
  RETRY_JITTER: 0.1,
  MAX_ATTEMPTS: 8,
  // Channex allows 10 availability and 10 price/restriction calls per property per
  // minute, and the worker runs once a minute; calls above this wait for the next run.
  MAX_CALLS_PER_BUCKET_PER_RUN: 10,
});
