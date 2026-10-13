import { compactChannexValuesToDateRanges } from "../../.shared/channelManagement/utils/channexAriDateRanges.js";

const restriction = (date, overrides = {}) => ({
  property_id: "property-1",
  rate_plan_id: "rate-1",
  date,
  rate: "150.00",
  min_stay_through: 2,
  ...overrides,
});

// Channex certification (12 Oct) asked for "date_range syntax with merged sequences instead
// of single-date objects": consecutive dates with the same values become one range.
describe("compactChannexValuesToDateRanges", () => {
  test("merges consecutive dates with the same values into one range", () => {
    expect(
      compactChannexValuesToDateRanges([restriction("2026-11-01"), restriction("2026-11-02"), restriction("2026-11-03")])
    ).toEqual([
      {
        property_id: "property-1",
        rate_plan_id: "rate-1",
        rate: "150.00",
        min_stay_through: 2,
        date_from: "2026-11-01",
        date_to: "2026-11-03",
      },
    ]);
  });

  test("keeps a single date as date", () => {
    expect(compactChannexValuesToDateRanges([restriction("2026-11-01")])).toEqual([restriction("2026-11-01")]);
  });

  test("starts a new range after a gap in the dates", () => {
    const compacted = compactChannexValuesToDateRanges([
      restriction("2026-11-01"),
      restriction("2026-11-02"),
      restriction("2026-11-05"),
    ]);

    expect(compacted.map(({ date, date_from, date_to }) => [date ?? date_from, date_to ?? null])).toEqual([
      ["2026-11-01", "2026-11-02"],
      ["2026-11-05", null],
    ]);
  });

  test("starts a new range where a value changes", () => {
    const compacted = compactChannexValuesToDateRanges([
      restriction("2026-11-01"),
      restriction("2026-11-02", { rate: "200.00" }),
      restriction("2026-11-03", { rate: "200.00" }),
    ]);

    expect(compacted).toEqual([
      restriction("2026-11-01"),
      expect.objectContaining({ rate: "200.00", date_from: "2026-11-02", date_to: "2026-11-03" }),
    ]);
  });

  test("does not merge dates of different rate plans", () => {
    const compacted = compactChannexValuesToDateRanges([
      restriction("2026-11-01"),
      restriction("2026-11-02", { rate_plan_id: "rate-2" }),
    ]);

    expect(compacted).toHaveLength(2);
  });

  test("merges correctly when the dates arrive out of order", () => {
    expect(
      compactChannexValuesToDateRanges([restriction("2026-11-03"), restriction("2026-11-01"), restriction("2026-11-02")])
    ).toEqual([expect.objectContaining({ date_from: "2026-11-01", date_to: "2026-11-03" })]);
  });

  test("treats the same values in a different key order as equal", () => {
    const reordered = { min_stay_through: 2, rate: "150.00", date: "2026-11-02", rate_plan_id: "rate-1", property_id: "property-1" };

    expect(compactChannexValuesToDateRanges([restriction("2026-11-01"), reordered])).toHaveLength(1);
  });

  test("merges across a month end", () => {
    expect(compactChannexValuesToDateRanges([restriction("2026-11-30"), restriction("2026-12-01")])).toEqual([
      expect.objectContaining({ date_from: "2026-11-30", date_to: "2026-12-01" }),
    ]);
  });

  test("passes values without a single date through unchanged", () => {
    const range = { property_id: "property-1", date_from: "2026-11-01", date_to: "2026-11-10", availability: 1 };

    expect(compactChannexValuesToDateRanges([range])).toEqual([range]);
  });
});
