import {
  expandDateRange,
  groupChangesForSend,
} from "../../.shared/channelManagement/utils/channexAriOutboxPlanning.js";

const row = (changeTypes, dateFrom, dateTo) => ({ id: `${changeTypes}-${dateFrom}`, changeTypes, dateFrom, dateTo });

describe("expandDateRange", () => {
  test("lists every date from dateFrom to dateTo inclusive, as ISO strings", () => {
    expect(expandDateRange(20261130, 20261202)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
  });

  test("handles a single day", () => {
    expect(expandDateRange(20261101, 20261101)).toEqual(["2026-11-01"]);
  });
});

describe("groupChangesForSend", () => {
  test("one change becomes one call", () => {
    expect(groupChangesForSend([row(["rates"], 20261101, 20261102)])).toEqual([
      { changeTypes: ["rates"], changedDates: ["2026-11-01", "2026-11-02"] },
    ]);
  });

  test("several saves of the same type become one call over all their dates", () => {
    const groups = groupChangesForSend([row(["rates"], 20261101, 20261102), row(["rates"], 20261201, 20261201)]);

    expect(groups).toEqual([{ changeTypes: ["rates"], changedDates: ["2026-11-01", "2026-11-02", "2026-12-01"] }]);
  });

  test("overlapping ranges do not send a date twice", () => {
    const groups = groupChangesForSend([row(["availability"], 20261101, 20261103), row(["availability"], 20261102, 20261104)]);

    expect(groups[0].changedDates).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
  });

  test("types that changed on exactly the same dates share one call", () => {
    const groups = groupChangesForSend([row(["rates", "restrictions"], 20261101, 20261101)]);

    expect(groups).toEqual([{ changeTypes: ["rates", "restrictions"], changedDates: ["2026-11-01"] }]);
  });

  test("types on different dates get separate calls, so no date receives a field that did not change", () => {
    const groups = groupChangesForSend([row(["rates"], 20261101, 20261101), row(["restrictions"], 20261120, 20261120)]);

    expect(groups).toEqual([
      { changeTypes: ["rates"], changedDates: ["2026-11-01"] },
      { changeTypes: ["restrictions"], changedDates: ["2026-11-20"] },
    ]);
  });

  test("availability always comes first, then rates, then restrictions", () => {
    const groups = groupChangesForSend([row(["restrictions"], 20261102, 20261102), row(["availability"], 20261101, 20261101)]);

    expect(groups.map((group) => group.changeTypes)).toEqual([["availability"], ["restrictions"]]);
  });

  test("no rows means no calls", () => {
    expect(groupChangesForSend([])).toEqual([]);
  });

  test("dates more than 500 days apart go out in separate calls", () => {
    const groups = groupChangesForSend([row(["rates"], 20261101, 20261101), row(["rates"], 20280315, 20280316)]);

    expect(groups).toEqual([
      { changeTypes: ["rates"], changedDates: ["2026-11-01"] },
      { changeTypes: ["rates"], changedDates: ["2028-03-15", "2028-03-16"] },
    ]);
  });

  test("no call spans more than 500 days", () => {
    const groups = groupChangesForSend([row(["restrictions"], 20261101, 20280601)]);

    const spans = groups.map(({ changedDates }) => (Date.parse(changedDates.at(-1)) - Date.parse(changedDates[0])) / 86_400_000 + 1);
    expect(groups).toHaveLength(2);
    expect(Math.max(...spans)).toBe(500);
    expect(groups.flatMap((group) => group.changedDates)).toHaveLength(579);
  });
});
