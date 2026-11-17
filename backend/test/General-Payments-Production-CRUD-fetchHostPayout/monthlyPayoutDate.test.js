import { describe, expect, it } from "@jest/globals";
import { getNextMonthlyPayoutDate } from "../../functions/General-Payments-Production-CRUD-fetchHostPayout/business/service/monthlyPayoutDate.js";

const utcDate = (year, month, day) => new Date(Date.UTC(year, month - 1, day, 12));

describe("getNextMonthlyPayoutDate", () => {
  it.each([
    [31, utcDate(2027, 2, 10), "2027-02-28T00:00:00.000Z"],
    [31, utcDate(2028, 2, 10), "2028-02-29T00:00:00.000Z"],
    [30, utcDate(2027, 2, 10), "2027-02-28T00:00:00.000Z"],
    [31, utcDate(2026, 11, 29), "2026-11-30T00:00:00.000Z"],
    [31, utcDate(2026, 10, 30), "2026-10-31T00:00:00.000Z"],
    [31, utcDate(2026, 11, 30), "2026-12-31T00:00:00.000Z"],
    [31, utcDate(2026, 12, 31), "2027-01-31T00:00:00.000Z"],
    [15, utcDate(2026, 10, 14), "2026-10-15T00:00:00.000Z"],
    [15, utcDate(2026, 10, 15), "2026-11-15T00:00:00.000Z"],
  ])("returns the next payout for day %i from %s", (anchor, fromDate, expected) => {
    expect(getNextMonthlyPayoutDate(anchor, fromDate)?.toISOString()).toBe(expected);
  });

  it.each([0, 32, "31", null])("returns null for an invalid monthly anchor: %s", (anchor) => {
    expect(getNextMonthlyPayoutDate(anchor, utcDate(2027, 2, 10))).toBeNull();
  });

  it("returns null for an invalid date", () => {
    expect(getNextMonthlyPayoutDate(31, new Date("invalid"))).toBeNull();
  });
});
