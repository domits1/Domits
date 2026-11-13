import { TOTAL_BASIS_POINTS, addsUpToTotal, basisPointsToPercent, percentToBasisPoints } from "./basisPoints";

describe("percentToBasisPoints", () => {
  test.each([
    [100, 10000],
    [60, 6000],
    [33.33, 3333],
    [0.01, 1],
    [12.5, 1250],
    [0, 0],
    ["33.33", 3333],
    [" 25 ", 2500],
    ["7.5", 750],
    ["100.00", 10000],
  ])("converts %p to %p basis points", (percent, basisPoints) => {
    expect(percentToBasisPoints(percent)).toBe(basisPoints);
  });

  test("never returns a float for a two-decimal value that has no exact binary form", () => {
    for (let hundredths = 0; hundredths <= 10000; hundredths += 1) {
      const percent = hundredths / 100;
      expect(percentToBasisPoints(percent)).toBe(hundredths);
    }
  });

  test.each([
    ["more than two decimals", 33.333],
    ["more than two decimals as text", "33.335"],
    ["above 100", 100.01],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["exponent notation", 1e-7],
    ["a comma decimal", "33,33"],
    ["empty text", ""],
    ["a trailing dot", "33."],
    ["null", null],
    ["an object", {}],
  ])("returns null for %s", (_label, percent) => {
    expect(percentToBasisPoints(percent)).toBeNull();
  });
});

describe("basisPointsToPercent", () => {
  test.each([
    [10000, 100],
    [3333, 33.33],
    [1, 0.01],
    [0, 0],
  ])("converts %p basis points to %p percent", (basisPoints, percent) => {
    expect(basisPointsToPercent(basisPoints)).toBe(percent);
  });

  test("round-trips every basis point value", () => {
    for (let basisPoints = 0; basisPoints <= TOTAL_BASIS_POINTS; basisPoints += 1) {
      expect(percentToBasisPoints(basisPointsToPercent(basisPoints))).toBe(basisPoints);
    }
  });

  test.each([
    ["a fraction", 33.5],
    ["negative", -1],
    ["above the total", 10001],
    ["text", "3333"],
  ])("returns null for %s", (_label, basisPoints) => {
    expect(basisPointsToPercent(basisPoints)).toBeNull();
  });
});

describe("addsUpToTotal", () => {
  test.each([
    [[10000]],
    [[6000, 4000]],
    [[3333, 3333, 3334]],
  ])("accepts %p", (list) => {
    expect(addsUpToTotal(list)).toBe(true);
  });

  test.each([
    ["three thirds rounded down", [3333, 3333, 3333]],
    ["above the total", [6000, 4001]],
    ["an empty list", []],
    ["a fraction that sums to the total", [5000.5, 4999.5]],
    ["a negative entry", [10001, -1]],
    ["text entries", ["6000", "4000"]],
    ["not an array", 10000],
  ])("rejects %s", (_label, list) => {
    expect(addsUpToTotal(list)).toBe(false);
  });
});
