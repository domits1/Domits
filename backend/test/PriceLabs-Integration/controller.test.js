const { validateDateRange } = require("../../functions/PriceLabs-Integration/controller/controller.js");

describe("validateDateRange", () => {
  test("accepts a valid same-day range", () => {
    expect(() => validateDateRange("2026-09-01", "2026-09-01")).not.toThrow();
  });

  test("accepts a valid multi-day range within the limit", () => {
    expect(() => validateDateRange("2026-09-01", "2026-09-30")).not.toThrow();
  });

  test.each([
    ["banana", "2026-09-30"],
    ["2026-09-01", "banana"],
    ["2026/09/01", "2026-09-30"],
    ["", "2026-09-30"],
    [undefined, "2026-09-30"],
  ])("rejects malformed startDate %p / endDate %p with a 400", (startDate, endDate) => {
    expect(() => validateDateRange(startDate, endDate)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  test("rejects a startDate after endDate", () => {
    expect(() => validateDateRange("2026-09-30", "2026-09-01")).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  test("rejects a range longer than 366 days", () => {
    expect(() => validateDateRange("2025-01-01", "2026-12-31")).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  test("accepts a range exactly at the 366 day limit", () => {
    expect(() => validateDateRange("2024-01-01", "2024-12-31")).not.toThrow();
  });
});
