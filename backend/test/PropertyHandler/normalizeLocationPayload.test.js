import { describe, expect, it } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const ADDRESS = { street: "Damrak", postalCode: "1012 LG", city: "Amsterdam", country: "Netherlands" };

// The editor sends houseNumber as a number and houseNumberExtension as a string; other clients may send
// one string such as "12A". The column is an INTEGER, so the number has to come first.
describe("PropertyController.normalizeLocationPayload house number", () => {
  const controller = new PropertyController();
  const normalize = (location) => controller.normalizeLocationPayload({ ...ADDRESS, ...location });

  it("keeps a numeric house number and an empty extension", () => {
    expect(normalize({ houseNumber: 12 })).toMatchObject({ houseNumber: 12, houseNumberExtension: "" });
  });

  it.each([
    ["12A", 12, "A"],
    ["12 A", 12, "A"],
    ["12-14", 12, "-14"],
    [" 12 ", 12, ""],
  ])("splits the string %p into number %p and extension %p", (houseNumber, number, extension) => {
    expect(normalize({ houseNumber })).toMatchObject({ houseNumber: number, houseNumberExtension: extension });
  });

  it("prefers the extension sent in its own field over the one inside the string", () => {
    expect(normalize({ houseNumber: "12A", houseNumberExtension: "B" })).toMatchObject({
      houseNumber: 12,
      houseNumberExtension: "B",
    });
  });

  it.each(["A12", "", "   ", "-12"])("rejects the string %p because it does not start with a number", (houseNumber) => {
    expect(() => normalize({ houseNumber })).toThrow("Location houseNumber must start with a number.");
  });

  it("answers a rejected house number as a client error", () => {
    let thrown;
    try {
      normalize({ houseNumber: "A12" });
    } catch (error) {
      thrown = error;
    }

    expect(controller.isOverviewClientError(thrown)).toBe(true);
  });

  it("rejects a location without a house number", () => {
    expect(() => normalize({})).toThrow("Location requires street, houseNumber, postalCode, city and country.");
  });
});
