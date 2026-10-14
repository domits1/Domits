import { calculatePriceSaving } from "../utils/calculatePriceSaving";

const baseConfig = {
  domitsCommissionRate: 0.1,
  comparisonCommissionRate: 0.155,
  comparisonPlatformLabel: "other sites",
};

describe("calculatePriceSaving", () => {
  test("returns the correct saving amount and platformLabel for valid input", () => {
    expect(calculatePriceSaving(1000, baseConfig)).toEqual({
      amount: 55,
      platformLabel: "other sites",
    });
  });

  test("returns the exact spec example: €2,000 total at 0.10 vs 0.155", () => {
    expect(calculatePriceSaving(2000, baseConfig)).toEqual({
      amount: 110,
      platformLabel: "other sites",
    });
  });

  test.each([
    ["zero", 0],
    ["negative", -100],
  ])("returns null when bookingTotal is %s", (_label, bookingTotal) => {
    expect(calculatePriceSaving(bookingTotal, baseConfig)).toBeNull();
  });

  test.each([
    ["NaN", NaN],
    ["a string", "1000"],
    ["undefined", undefined],
  ])("returns null when bookingTotal is %s", (_label, bookingTotal) => {
    expect(calculatePriceSaving(bookingTotal, baseConfig)).toBeNull();
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
  ])("returns null when config is %s", (_label, config) => {
    expect(calculatePriceSaving(1000, config)).toBeNull();
  });

  test("returns null when config is missing comparisonPlatformLabel", () => {
    const { comparisonPlatformLabel, ...configWithoutLabel } = baseConfig;
    expect(calculatePriceSaving(1000, configWithoutLabel)).toBeNull();
  });

  test.each([
    ["domitsCommissionRate", { ...baseConfig, domitsCommissionRate: NaN }],
    ["domitsCommissionRate", { ...baseConfig, domitsCommissionRate: "0.10" }],
    ["domitsCommissionRate", { ...baseConfig, domitsCommissionRate: undefined }],
    ["comparisonCommissionRate", { ...baseConfig, comparisonCommissionRate: NaN }],
    ["comparisonCommissionRate", { ...baseConfig, comparisonCommissionRate: "0.155" }],
    ["comparisonCommissionRate", { ...baseConfig, comparisonCommissionRate: undefined }],
  ])("returns null when %s is not a valid number", (_field, config) => {
    expect(calculatePriceSaving(1000, config)).toBeNull();
  });

  test.each([
    ["equal", { ...baseConfig, domitsCommissionRate: 0.155, comparisonCommissionRate: 0.155 }],
    ["greater than", { ...baseConfig, domitsCommissionRate: 0.2, comparisonCommissionRate: 0.155 }],
  ])(
    "returns null when domitsCommissionRate is %s comparisonCommissionRate",
    (_label, config) => {
      expect(calculatePriceSaving(1000, config)).toBeNull();
    }
  );

  test("returns null when the rounded saving is 0", () => {
    const config = { ...baseConfig, domitsCommissionRate: 0.1, comparisonCommissionRate: 0.104 };
    expect(calculatePriceSaving(1, config)).toBeNull();
  });
});
