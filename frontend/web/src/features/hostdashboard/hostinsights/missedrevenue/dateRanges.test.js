import { getCurrentMonthRange, getPreviousMonthRange, getYearToDateRange } from "./MissedRevenueDashboardPage";

describe("missed-revenue dashboard date ranges", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("current month range covers the full calendar month", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-15T12:00:00Z"));

    expect(getCurrentMonthRange()).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
  });

  test("previous month range covers the full prior calendar month", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-15T12:00:00Z"));

    expect(getPreviousMonthRange()).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
  });

  test("previous month range rolls back across a year boundary in January", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T12:00:00Z"));

    expect(getPreviousMonthRange()).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
  });

  test("year-to-date range runs from January 1st through today", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-15T12:00:00Z"));

    expect(getYearToDateRange()).toEqual({ startDate: "2026-01-01", endDate: "2026-09-15" });
  });
});
