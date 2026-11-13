import { buildReviewHistoryRows } from "./reviewHistoryFormat";

const WHEN = new Date(2026, 9, 30, 14, 5).getTime();

const makeEvent = (overrides = {}) => ({
  id: "e1",
  action: "SUBMITTED",
  fromStatus: "INACTIVE",
  toStatus: "PENDING_REVIEW",
  reason: null,
  actorId: "host-1",
  createdAt: WHEN,
  ...overrides,
});

describe("buildReviewHistoryRows warnings", () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("warns once with the dropped count when one entry has an invalid createdAt", () => {
    const rows = buildReviewHistoryRows(
      [makeEvent({ id: "a" }), makeEvent({ id: "bad", createdAt: "not a time" }), makeEvent({ id: "b" })],
      "host-1"
    );

    expect(rows).toHaveLength(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("Review history skipped 1 unreadable entry.");
  });

  test("counts every kind of dropped entry in a single warning", () => {
    buildReviewHistoryRows(
      [null, makeEvent({ action: "ARCHIVED" }), makeEvent({ createdAt: Number.NaN }), makeEvent({ id: "ok" })],
      "host-1"
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("Review history skipped 3 unreadable entries.");
  });

  test.each([[[]], [[makeEvent(), makeEvent({ action: "APPROVED", actorId: "admin-1" })]]])(
    "does not warn when every entry can be shown (%#)",
    (history) => {
      buildReviewHistoryRows(history, "host-1");

      expect(warnSpy).not.toHaveBeenCalled();
    }
  );

  test.each([[undefined], [null], [{}], ["history"], [42]])(
    "warns once and returns no rows when history is not a list (%#)",
    (history) => {
      expect(buildReviewHistoryRows(history, "host-1")).toEqual([]);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith("Review history is not a list, so nothing was shown.");
    }
  );

  test("keeps entry contents out of the warning", () => {
    buildReviewHistoryRows(
      [
        makeEvent({
          id: "entry-id-9",
          action: "REJECTED",
          actorId: "SECRET-ACTOR",
          reason: "SECRET REASON",
          createdAt: "bad",
        }),
        { actorId: "OTHER-SECRET-ACTOR", reason: "OTHER SECRET REASON" },
      ],
      "SECRET-HOST"
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [args] = warnSpy.mock.calls;
    expect(args).toEqual(["Review history skipped 2 unreadable entries."]);
    const logged = JSON.stringify(warnSpy.mock.calls);
    ["SECRET-ACTOR", "SECRET REASON", "entry-id-9", "SECRET-HOST", "OTHER"].forEach((secret) => {
      expect(logged).not.toContain(secret);
    });
  });

  test("warns once per call, not once per dropped entry", () => {
    buildReviewHistoryRows([null, null, null, null], "host-1");

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
