import { describe, expect, it } from "@jest/globals";
import {
  formatMinorUnits,
  getCurrencyFractionDigits,
  parseDecimalToMinorUnits,
} from "../../functions/.shared/money/currencyAmount.js";

describe("currency minor-unit conversion", () => {
  test.each([
    ["EUR", "1.005", "101"],
    ["GBP", "1.23", "123"],
    ["JPY", "125", "125"],
    ["BHD", "1.234", "1234"],
  ])("parses %s amounts using the currency exponent", (currency, amount, expected) => {
    expect(parseDecimalToMinorUnits(amount, currency)).toBe(expected);
  });

  test("rounds excess precision half-up for positive and negative amounts", () => {
    expect(parseDecimalToMinorUnits("2.5", "EUR")).toBe("250");
    expect(parseDecimalToMinorUnits("-1.005", "EUR")).toBe("-101");
  });

  test("formats minor units without passing through floating-point numbers", () => {
    expect(formatMinorUnits("12345", "EUR")).toBe("123.45");
    expect(formatMinorUnits("125", "JPY")).toBe("125");
    expect(formatMinorUnits("1234", "BHD")).toBe("1.234");
  });

  test("rejects malformed or unsupported currency input", () => {
    expect(() => parseDecimalToMinorUnits("1,25", "EUR")).toThrow(TypeError);
    expect(() => getCurrencyFractionDigits("EURO")).toThrow(TypeError);
    expect(() => formatMinorUnits("1.5", "EUR")).toThrow(TypeError);
    expect(() => parseDecimalToMinorUnits("10000000000000000000", "EUR")).toThrow(RangeError);
    expect(() => formatMinorUnits("9223372036854775808", "EUR")).toThrow(RangeError);
  });
});
