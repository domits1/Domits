const {
  allocateByBasisPoints,
  calculateBasisPointAmount,
  parseDecimalToMinorUnits,
} = require("../../functions/property-owners/business/service/ownerStatementCalculations.js");

describe("parseDecimalToMinorUnits", () => {
  test.each([
    ["decimal string", "123.45", 2, "half-up", 12345n],
    ["number", 12.34, 2, "half-up", 1234n],
    ["zero-decimal currency", "125", 0, "half-up", 125n],
    ["scientific notation", "1.25e2", 2, "half-up", 12500n],
    ["negative amount", "-12.34", 2, "half-up", -1234n],
  ])("parses a %s using the supplied currency precision", (_label, amount, fractionDigits, roundingMode, expected) => {
    expect(parseDecimalToMinorUnits(amount, { fractionDigits, roundingMode })).toBe(expected);
  });

  test("uses the explicitly supplied half-up rule for excess precision", () => {
    expect(parseDecimalToMinorUnits("10.005", { fractionDigits: 2, roundingMode: "half-up" })).toBe(1001n);
    expect(parseDecimalToMinorUnits("-10.005", { fractionDigits: 2, roundingMode: "half-up" })).toBe(-1001n);
  });

  test("uses half-even ties without biasing positive or negative amounts", () => {
    expect(parseDecimalToMinorUnits("2.5", { fractionDigits: 0, roundingMode: "half-even" })).toBe(2n);
    expect(parseDecimalToMinorUnits("3.5", { fractionDigits: 0, roundingMode: "half-even" })).toBe(4n);
    expect(parseDecimalToMinorUnits("-2.5", { fractionDigits: 0, roundingMode: "half-even" })).toBe(-2n);
  });

  test("distinguishes floor, ceiling, up and down for negative values", () => {
    expect(parseDecimalToMinorUnits("-1.21", { fractionDigits: 1, roundingMode: "floor" })).toBe(-13n);
    expect(parseDecimalToMinorUnits("-1.21", { fractionDigits: 1, roundingMode: "ceiling" })).toBe(-12n);
    expect(parseDecimalToMinorUnits("-1.21", { fractionDigits: 1, roundingMode: "up" })).toBe(-13n);
    expect(parseDecimalToMinorUnits("-1.21", { fractionDigits: 1, roundingMode: "down" })).toBe(-12n);
  });

  test.each([
    ["missing amount", undefined, { fractionDigits: 2, roundingMode: "half-up" }],
    ["non-finite number", Number.NaN, { fractionDigits: 2, roundingMode: "half-up" }],
    ["invalid decimal", "12,34", { fractionDigits: 2, roundingMode: "half-up" }],
    ["missing precision", "12.34", { roundingMode: "half-up" }],
    ["unsupported precision", "12.34", { fractionDigits: 7, roundingMode: "half-up" }],
    ["missing rounding mode", "12.34", { fractionDigits: 2 }],
    ["unknown rounding mode", "12.34", { fractionDigits: 2, roundingMode: "bankers" }],
  ])("rejects %s", (_label, amount, options) => {
    expect(() => parseDecimalToMinorUnits(amount, options)).toThrow(TypeError);
  });
});

describe("calculateBasisPointAmount", () => {
  test("calculates an explicitly configured share in minor units", () => {
    expect(calculateBasisPointAmount("10000", 2500, "half-up")).toBe(2500n);
    expect(calculateBasisPointAmount(10000n, 10000, "half-up")).toBe(10000n);
  });

  test("applies the selected rounding mode to fractional minor units", () => {
    expect(calculateBasisPointAmount(5n, 5000, "half-up")).toBe(3n);
    expect(calculateBasisPointAmount(5n, 5000, "half-even")).toBe(2n);
    expect(calculateBasisPointAmount(-5n, 5000, "half-up")).toBe(-3n);
    expect(calculateBasisPointAmount(-5n, 5000, "down")).toBe(-2n);
  });

  test.each([-1, 10001, 1.5, Number.NaN])("rejects basis-point value %p", (basisPoints) => {
    expect(() => calculateBasisPointAmount(1000n, basisPoints, "half-up")).toThrow(TypeError);
  });

  test("requires an explicit rounding mode", () => {
    expect(() => calculateBasisPointAmount(1000n, 5000)).toThrow(TypeError);
  });

  test("rejects non-integer minor-unit amounts", () => {
    expect(() => calculateBasisPointAmount("10.5", 5000, "half-up")).toThrow(TypeError);
  });
});

describe("allocateByBasisPoints", () => {
  test("allocates the full amount and assigns remainders to the largest fractional shares", () => {
    expect(
      allocateByBasisPoints(
        100n,
        [
          { ownerId: "owner-a", ownershipBasisPoints: 3333 },
          { ownerId: "owner-b", ownershipBasisPoints: 3333 },
          { ownerId: "owner-c", ownershipBasisPoints: 3334 },
        ],
        { allocationPolicy: "largest-remainder" }
      )
    ).toEqual([
      { ownerId: "owner-a", ownershipBasisPoints: 3333, amountMinorUnits: 33n },
      { ownerId: "owner-b", ownershipBasisPoints: 3333, amountMinorUnits: 33n },
      { ownerId: "owner-c", ownershipBasisPoints: 3334, amountMinorUnits: 34n },
    ]);
  });

  test("uses owner ID as a stable tie-breaker when fractional remainders are equal", () => {
    expect(
      allocateByBasisPoints(
        1n,
        [
          { ownerId: "owner-b", ownershipBasisPoints: 5000 },
          { ownerId: "owner-a", ownershipBasisPoints: 5000 },
        ],
        { allocationPolicy: "largest-remainder" }
      )
    ).toEqual([
      { ownerId: "owner-b", ownershipBasisPoints: 5000, amountMinorUnits: 0n },
      { ownerId: "owner-a", ownershipBasisPoints: 5000, amountMinorUnits: 1n },
    ]);
  });

  test("preserves negative adjustments and returns amounts as BigInt values", () => {
    expect(
      allocateByBasisPoints(
        -1n,
        [
          { ownerId: "owner-b", ownershipBasisPoints: 5000 },
          { ownerId: "owner-a", ownershipBasisPoints: 5000 },
        ],
        { allocationPolicy: "largest-remainder" }
      )
    ).toEqual([
      { ownerId: "owner-b", ownershipBasisPoints: 5000, amountMinorUnits: 0n },
      { ownerId: "owner-a", ownershipBasisPoints: 5000, amountMinorUnits: -1n },
    ]);
  });

  test.each([
    ["no owners", []],
    ["shares below 100 percent", [{ ownerId: "owner-a", ownershipBasisPoints: 9999 }]],
    ["shares above 100 percent", [{ ownerId: "owner-a", ownershipBasisPoints: 10001 }]],
    [
      "duplicate owners",
      [
        { ownerId: "owner-a", ownershipBasisPoints: 5000 },
        { ownerId: "owner-a", ownershipBasisPoints: 5000 },
      ],
    ],
    ["zero share", [{ ownerId: "owner-a", ownershipBasisPoints: 0 }]],
    ["empty owner ID", [{ ownerId: " ", ownershipBasisPoints: 10000 }]],
  ])("rejects %s", (_label, shares) => {
    expect(() => allocateByBasisPoints(100n, shares, { allocationPolicy: "largest-remainder" })).toThrow(TypeError);
  });

  test("requires an explicit allocation policy", () => {
    expect(() =>
      allocateByBasisPoints(100n, [{ ownerId: "owner-a", ownershipBasisPoints: 10000 }])
    ).toThrow(TypeError);
  });

  test("rejects fractional minor-unit amounts", () => {
    expect(() =>
      allocateByBasisPoints("100.5", [{ ownerId: "owner-a", ownershipBasisPoints: 10000 }], {
        allocationPolicy: "largest-remainder",
      })
    ).toThrow(TypeError);
  });
});
