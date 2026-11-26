import {
  HOUSE_NUMBER_FORMAT_MESSAGE,
  HOUSE_NUMBER_TOO_LARGE_MESSAGE,
  HOUSE_NUMBER_TOO_SMALL_MESSAGE,
  MAX_HOUSE_NUMBER,
  getHouseNumberError,
  parseHouseNumber,
} from "./houseNumber";

// The column is an INTEGER, so the number has to come first and the rest goes into the extension.
describe("parseHouseNumber", () => {
  it.each([
    ["12", 12, ""],
    ["12A", 12, "A"],
    ["12 A", 12, "A"],
    ["12-14", 12, "-14"],
    [" 12 ", 12, ""],
    ["007", 7, ""],
  ])("splits %p into number %p and extension %p", (input, houseNumber, houseNumberExtension) => {
    expect(parseHouseNumber(input)).toEqual({ houseNumber, houseNumberExtension });
  });

  it.each(["A12", "-12", "", "   ", undefined, null])("returns null for %p", (input) => {
    expect(parseHouseNumber(input)).toBeNull();
  });

  it("accepts a number the way a stored location returns it", () => {
    expect(parseHouseNumber(12)).toEqual({ houseNumber: 12, houseNumberExtension: "" });
  });
});

describe("getHouseNumberError", () => {
  it.each(["", "   ", undefined, null])("has nothing to complain about for the empty value %p", (input) => {
    expect(getHouseNumberError(input)).toBe("");
  });

  it.each(["12", "12A", "12 A", "12-14", String(MAX_HOUSE_NUMBER)])("accepts %p", (input) => {
    expect(getHouseNumberError(input)).toBe("");
  });

  it.each(["A12", "-12", "#12"])("says %p has to start with a number", (input) => {
    expect(getHouseNumberError(input)).toBe(HOUSE_NUMBER_FORMAT_MESSAGE);
  });

  it.each(["0", "00", "0A"])("rejects %p because the house number must be at least 1", (input) => {
    expect(getHouseNumberError(input)).toBe(HOUSE_NUMBER_TOO_SMALL_MESSAGE);
  });

  it.each([String(MAX_HOUSE_NUMBER + 1), "99999999999", `1${"0".repeat(400)}`])(
    "rejects %p because it does not fit the INTEGER column",
    (input) => {
      expect(getHouseNumberError(input)).toBe(HOUSE_NUMBER_TOO_LARGE_MESSAGE);
    }
  );

  it("names the example the host should follow", () => {
    expect(HOUSE_NUMBER_FORMAT_MESSAGE).toBe("House number must start with a number, for example 12 or 12A.");
  });
});
