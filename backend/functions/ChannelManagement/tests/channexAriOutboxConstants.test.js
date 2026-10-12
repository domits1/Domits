import {
  CHANNEX_ARI_CHANGE_TYPE,
  CHANNEX_ARI_OUTBOX_DEFAULTS,
  CHANNEX_ARI_OUTBOX_KIND,
  CHANNEX_ARI_OUTBOX_SOURCE,
  CHANNEX_ARI_OUTBOX_STATUS,
  URGENT_SOURCES,
} from "../../.shared/channelManagement/utils/channexAriOutboxConstants.js";

describe("Channex ARI outbox constants", () => {
  test("bookings and Channex imports are the sources that skip the quiet period", () => {
    expect(URGENT_SOURCES).toEqual([CHANNEX_ARI_OUTBOX_SOURCE.BOOKING, CHANNEX_ARI_OUTBOX_SOURCE.CHANNEX_IMPORT]);
  });

  test("a calendar or global settings change is not urgent, so it waits for the quiet period", () => {
    expect(URGENT_SOURCES).not.toContain(CHANNEX_ARI_OUTBOX_SOURCE.CALENDAR);
    expect(URGENT_SOURCES).not.toContain(CHANNEX_ARI_OUTBOX_SOURCE.GLOBAL_SETTINGS);
  });

  test("the timing defaults match the design: 60 seconds quiet, 5 minute cap", () => {
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.QUIET_MS).toBe(60_000);
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.CAP_MS).toBe(300_000);
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.CAP_MS).toBeGreaterThan(CHANNEX_ARI_OUTBOX_DEFAULTS.QUIET_MS);
  });

  test("the cleanup batch stays under the Aurora DSQL limit of 3000 rows per transaction", () => {
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.CLEANUP_BATCH).toBeLessThan(3000);
  });

  test("failed rows are kept longer than processed ones, so failures can still be investigated", () => {
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.FAILED_RETENTION_MS).toBeGreaterThan(
      CHANNEX_ARI_OUTBOX_DEFAULTS.PROCESSED_RETENTION_MS
    );
  });

  test("the push timeout is shorter than the worker run, so a hanging call cannot outlive it", () => {
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS).toBe(8_000);
    expect(CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS).toBeLessThan(
      CHANNEX_ARI_OUTBOX_DEFAULTS.STALE_PROCESSING_MS
    );
  });

  test("statuses, kinds, sources and change types are spelled exactly as the database stores them", () => {
    expect(Object.values(CHANNEX_ARI_OUTBOX_STATUS)).toEqual([
      "PENDING",
      "PROCESSING",
      "PROCESSED",
      "SKIPPED",
      "FAILED",
    ]);
    expect(Object.values(CHANNEX_ARI_OUTBOX_KIND)).toEqual(["CHANGE", "FULL_SYNC"]);
    expect(Object.values(CHANNEX_ARI_OUTBOX_SOURCE)).toEqual([
      "CALENDAR",
      "GLOBAL_SETTINGS",
      "BOOKING",
      "CHANNEX_IMPORT",
    ]);
    expect(Object.values(CHANNEX_ARI_CHANGE_TYPE)).toEqual(["availability", "rates", "restrictions"]);
  });

  test("the constant objects cannot be changed at runtime", () => {
    expect(Object.isFrozen(CHANNEX_ARI_OUTBOX_STATUS)).toBe(true);
    expect(Object.isFrozen(CHANNEX_ARI_OUTBOX_DEFAULTS)).toBe(true);
  });
});
