import { toSyncHistoryRow, toSyncHistoryRows } from "./syncHistoryRows";

const FINISHED = 1758700005000;

const item = (overrides = {}) => ({
  id: "evidence-1",
  syncType: "ari",
  status: "SUCCESS",
  overallSuccess: true,
  startedAt: FINISHED - 5000,
  finishedAt: FINISHED,
  warnings: [],
  errors: [],
  ...overrides,
});

describe("toSyncHistoryRow: the kind of sync in host words", () => {
  test.each([
    ["ari", "Prices, availability and rules"],
    ["availability", "Availability"],
    ["restrictions", "Prices and stay rules"],
    ["calendar-change", "Calendar update"],
    ["certification_full", "Full sync"],
    ["booking_pull", "Bookings import"],
    ["booking_receive", "Booking received"],
    ["booking_ack", "Booking confirmed"],
  ])("%s is shown as %s", (syncType, label) => {
    expect(toSyncHistoryRow(item({ syncType })).kind).toBe(label);
  });

  test.each([["some_future_type"], ["constructor"], ["__proto__"], [undefined], [null], [""]])(
    "%p falls back to Sync and the raw value is never shown",
    (syncType) => {
      expect(toSyncHistoryRow(item({ syncType })).kind).toBe("Sync");
    }
  );
});

describe("toSyncHistoryRow: the outcome uses the Last sync rules", () => {
  test.each([
    ["a finished success", item(), "success", "Synced"],
    ["a success that has warnings", item({ warnings: [{ code: "W" }] }), "pending", "Warnings"],
    ["a failed status", item({ status: "FAILED", overallSuccess: false }), "error", "Failed"],
    ["errors without a failed status", item({ status: "X", overallSuccess: false, errors: [{}] }), "error", "Failed"],
    ["a partial status", item({ status: "PARTIAL", overallSuccess: false }), "error", "Partly failed"],
    ["a blocked sync", item({ status: "BLOCKED", overallSuccess: false }), "pending", "Blocked"],
    ["a sync with nothing to send", item({ status: "NOOP", overallSuccess: false }), "pending", "Nothing to send"],
    ["a sync that has not finished", item({ finishedAt: null, overallSuccess: false }), "pending", "Not finished"],
  ])("%s", (_name, evidence, tone, label) => {
    const row = toSyncHistoryRow(evidence);
    expect([row.tone, row.outcomeLabel]).toEqual([tone, label]);
  });
});

describe("toSyncHistoryRow: counts and what is kept", () => {
  test("counts the warnings and the errors from their lists", () => {
    const row = toSyncHistoryRow(item({ warnings: [{}, {}], errors: [{}, {}, {}], overallSuccess: false }));
    expect([row.warningCount, row.errorCount]).toEqual([2, 3]);
  });

  test.each([[undefined], [null], ["not a list"], [{}]])("counts %p as zero", (value) => {
    const row = toSyncHistoryRow(item({ warnings: value, errors: value }));
    expect([row.warningCount, row.errorCount]).toEqual([0, 0]);
  });

  test("keeps only the fields the card shows, never payloads, notes or error details", () => {
    const row = toSyncHistoryRow(
      item({
        groupedOutboundPayloadSnapshot: "{}",
        rawDetails: "{}",
        notes: ["internal note"],
        errors: [{ code: "SECRET_CODE", message: "detail" }],
        taskIds: ["task-1"],
      })
    );
    expect(Object.keys(row).sort()).toEqual(
      ["errorCount", "id", "kind", "outcomeLabel", "startedAt", "tone", "warningCount"].sort()
    );
    expect(JSON.stringify(row)).not.toContain("SECRET_CODE");
  });
});

describe("toSyncHistoryRows", () => {
  test("keeps the order the backend sent, newest first, and drops empty entries", () => {
    const rows = toSyncHistoryRows({
      items: [item({ id: "new" }), null, item({ id: "middle" }), item({ id: "old" })],
    });
    expect(rows.map((row) => row.id)).toEqual(["new", "middle", "old"]);
  });

  test("an empty list is an empty history", () => {
    expect(toSyncHistoryRows({ items: [] })).toEqual([]);
  });

  test.each([[undefined], [null], [{}], [{ items: null }], [{ items: "x" }]])(
    "an answer without a list (%p) throws, so it is never read as an empty history",
    (response) => {
      expect(() => toSyncHistoryRows(response)).toThrow(TypeError);
    }
  );
});
