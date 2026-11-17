import {
  DAY_MS,
  MAX_EFFECTIVE_FROM_DAYS_AHEAD,
  dateInputToUtcMidnight,
  isEffectiveFromInRange,
  latestEffectiveFrom,
  todayUtc,
  utcMidnightToDateInput,
} from "./utcDate";

const TODAY = Date.UTC(2026, 9, 30);

describe("todayUtc", () => {
  test.each([
    ["at midnight", "2026-10-30T00:00:00.000Z"],
    ["in the afternoon", "2026-10-30T15:30:00.000Z"],
    ["one millisecond before the next day", "2026-10-30T23:59:59.999Z"],
  ])("returns the UTC midnight of the clock %s", (_label, instant) => {
    expect(todayUtc(Date.parse(instant))).toBe(TODAY);
  });

  test("uses Date.now by default", () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-30T09:00:00Z"));

    expect(todayUtc()).toBe(TODAY);

    Date.now.mockRestore();
  });
});

describe("dateInputToUtcMidnight", () => {
  test.each([
    ["2026-10-30", TODAY],
    ["2028-02-29", Date.UTC(2028, 1, 29)],
    ["1970-01-01", 0],
  ])("converts %s to its UTC midnight", (value, expected) => {
    expect(dateInputToUtcMidnight(value)).toBe(expected);
  });

  test.each([
    ["an impossible day", "2026-02-30"],
    ["a non leap year 29 February", "2027-02-29"],
    ["month 13", "2026-13-01"],
    ["a two-digit year", "0050-01-01"],
    ["a date before 1970", "1969-12-31"],
    ["a time part", "2026-10-30T00:00"],
    ["another format", "30-10-2026"],
    ["empty text", ""],
    ["a number", TODAY],
    ["null", null],
  ])("returns null for %s", (_label, value) => {
    expect(dateInputToUtcMidnight(value)).toBeNull();
  });
});

describe("utcMidnightToDateInput", () => {
  test("formats a UTC midnight as a date input value", () => {
    expect(utcMidnightToDateInput(TODAY)).toBe("2026-10-30");
  });

  test.each([
    ["not a midnight", TODAY + 1],
    ["negative", -DAY_MS],
    ["text", "2026-10-30"],
  ])("returns null for %s", (_label, value) => {
    expect(utcMidnightToDateInput(value)).toBeNull();
  });
});

describe("isEffectiveFromInRange", () => {
  const NOW = Date.parse("2026-10-30T15:30:00Z");

  test("allows exactly 1826 days ahead, like the share validator", () => {
    expect(MAX_EFFECTIVE_FROM_DAYS_AHEAD).toBe(1826);
    expect(latestEffectiveFrom(NOW)).toBe(TODAY + 1826 * DAY_MS);
  });

  test.each([
    ["today", TODAY],
    ["tomorrow", TODAY + DAY_MS],
    ["the last allowed day", TODAY + MAX_EFFECTIVE_FROM_DAYS_AHEAD * DAY_MS],
  ])("accepts %s", (_label, effectiveFrom) => {
    expect(isEffectiveFromInRange(effectiveFrom, NOW)).toBe(true);
  });

  test.each([
    ["yesterday", TODAY - DAY_MS],
    ["one day past the limit", TODAY + (MAX_EFFECTIVE_FROM_DAYS_AHEAD + 1) * DAY_MS],
    ["not a UTC midnight", TODAY + 1],
    ["text", String(TODAY)],
    ["null", null],
  ])("rejects %s", (_label, effectiveFrom) => {
    expect(isEffectiveFromInRange(effectiveFrom, NOW)).toBe(false);
  });

  test("measures today in UTC, not in the local day of the clock", () => {
    const lateEvening = Date.parse("2026-10-30T23:59:59.999Z");

    expect(isEffectiveFromInRange(TODAY, lateEvening)).toBe(true);
    expect(isEffectiveFromInRange(TODAY, lateEvening + 1)).toBe(false);
  });
});
