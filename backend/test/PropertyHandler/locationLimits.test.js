import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { PropertyBuilder } from "../../functions/PropertyHandler/business/service/propertyBuilder.js";
import { LocationMapping } from "../../functions/PropertyHandler/util/mapping/location.js";
import {
  MAX_HOUSE_NUMBER,
  MAX_HOUSE_NUMBER_EXTENSION_LENGTH,
} from "../../functions/PropertyHandler/util/locationLimits.js";

const ADDRESS = { street: "Damrak", postalCode: "1012 LG", city: "Amsterdam", country: "Netherlands" };
const TOO_LARGE = `Location houseNumber must be ${MAX_HOUSE_NUMBER} or lower.`;
const TOO_SMALL = "Location houseNumber must be at least 1.";
const TOO_LONG = `Location houseNumberExtension must be ${MAX_HOUSE_NUMBER_EXTENSION_LENGTH} characters or fewer.`;
const LONG_EXTENSION = "x".repeat(MAX_HOUSE_NUMBER_EXTENSION_LENGTH + 1);

describe("overview update: location values the columns cannot store", () => {
  const controller = new PropertyController();
  const normalize = (location) => controller.normalizeLocationPayload({ ...ADDRESS, ...location });

  it.each([
    [MAX_HOUSE_NUMBER + 1],
    [1e21],
    [String(MAX_HOUSE_NUMBER + 1)],
    ["9".repeat(400)],
    [`${MAX_HOUSE_NUMBER + 1}A`],
  ])("rejects house number %p as too large", (houseNumber) => {
    expect(() => normalize({ houseNumber })).toThrow(TOO_LARGE);
  });

  it.each([[0], [-5], [0.5], [-0.5], ["0"], ["0A"], ["00"]])("rejects house number %p as below 1", (houseNumber) => {
    expect(() => normalize({ houseNumber })).toThrow(TOO_SMALL);
  });

  it.each([
    [1, 1],
    [MAX_HOUSE_NUMBER, MAX_HOUSE_NUMBER],
    [12.7, 12],
    ["007", 7],
    [String(MAX_HOUSE_NUMBER), MAX_HOUSE_NUMBER],
  ])("keeps house number %p as %p", (houseNumber, stored) => {
    expect(normalize({ houseNumber }).houseNumber).toBe(stored);
  });

  it("rejects an extension of 46 characters sent in its own field", () => {
    expect(() => normalize({ houseNumber: 12, houseNumberExtension: LONG_EXTENSION })).toThrow(TOO_LONG);
  });

  it("rejects an extension of 46 characters that is the tail of the house number string", () => {
    expect(() => normalize({ houseNumber: `12${LONG_EXTENSION}` })).toThrow(TOO_LONG);
  });

  it("keeps an extension of exactly 45 characters", () => {
    const extension = "x".repeat(MAX_HOUSE_NUMBER_EXTENSION_LENGTH);
    expect(normalize({ houseNumber: 12, houseNumberExtension: extension }).houseNumberExtension).toBe(extension);
  });

  it("counts characters, not UTF-16 units, as VARCHAR does", () => {
    const extension = "😀".repeat(MAX_HOUSE_NUMBER_EXTENSION_LENGTH);
    expect(normalize({ houseNumber: 12, houseNumberExtension: extension }).houseNumberExtension).toBe(extension);
  });

  it("still reports a missing house number with the existing message", () => {
    expect(() => normalize({})).toThrow("Location requires street, houseNumber, postalCode, city and country.");
  });

  it.each([TOO_LARGE, TOO_SMALL, TOO_LONG])("answers %p as a client error", (message) => {
    expect(controller.isOverviewClientError(new Error(message))).toBe(true);
  });

  it("answers the PATCH with 400 before authorizing or writing anything", async () => {
    const authorizeOwnerRequest = jest.fn();
    const updatePropertyOverview = jest.fn();
    controller.authManager = { authorizeOwnerRequest };
    controller.propertyService = { updatePropertyOverview };

    const response = await controller.updatePropertyOverview({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "p1",
        title: "Title",
        description: "Description",
        location: { ...ADDRESS, houseNumber: MAX_HOUSE_NUMBER + 1 },
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(TOO_LARGE);
    expect(authorizeOwnerRequest).not.toHaveBeenCalled();
    expect(updatePropertyOverview).not.toHaveBeenCalled();
  });
});

describe("create: PropertyBuilder.addLocation", () => {
  const addLocation = (location) => {
    const builder = new PropertyBuilder();
    builder.property = { id: "p1" };
    return builder.addLocation({ ...ADDRESS, houseNumber: 12, houseNumberExtension: "", ...location });
  };

  it.each([[MAX_HOUSE_NUMBER + 1, TOO_LARGE], [-5, TOO_SMALL], [0.5, TOO_SMALL]])(
    "rejects house number %p",
    (houseNumber, message) => {
      expect(() => addLocation({ houseNumber })).toThrow(message);
    }
  );

  it("rejects an extension of 46 characters", () => {
    expect(() => addLocation({ houseNumberExtension: LONG_EXTENSION })).toThrow(TOO_LONG);
  });

  it.each([[0], [NaN]])("keeps the Missing houseNumber message for %p", (houseNumber) => {
    expect(() => addLocation({ houseNumber })).toThrow("Missing houseNumber.");
  });

  it("accepts the largest number and the longest extension", () => {
    const extension = "x".repeat(MAX_HOUSE_NUMBER_EXTENSION_LENGTH);
    expect(addLocation({ houseNumber: MAX_HOUSE_NUMBER, houseNumberExtension: extension }).propertyLocation).toMatchObject({
      houseNumber: MAX_HOUSE_NUMBER,
      houseNumberExtension: extension,
    });
  });

  it.each([
    [{ houseNumber: MAX_HOUSE_NUMBER + 1 }, TOO_LARGE],
    [{ houseNumber: -5 }, TOO_SMALL],
    [{ houseNumberExtension: LONG_EXTENSION }, TOO_LONG],
  ])("answers POST /property with 400, not 500, for %p", async (location, message) => {
    const controller = new PropertyController();
    controller.authManager = { authorizeGroupRequest: jest.fn().mockResolvedValue("host-1") };
    controller.propertyService = { create: jest.fn() };
    controller.createPropertyObject = async () => addLocation(location);

    const response = await controller.create({ headers: { Authorization: "token" }, body: JSON.stringify({}) });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain(message);
    expect(controller.propertyService.create).not.toHaveBeenCalled();
  });
});

describe("reading a stored location is not limited", () => {
  it.each([
    [{ housenumber: 0, housenumberextension: "" }],
    [{ housenumber: -3, housenumberextension: "" }],
    [{ housenumber: 12, housenumberextension: LONG_EXTENSION }],
  ])("still loads the row %p", (stored) => {
    const row = { property_id: "p1", country: "Netherlands", city: "Amsterdam", street: "Damrak", postalcode: "1012 LG", ...stored };

    expect(LocationMapping.mapDatabaseEntryToFullLocation(row)).toMatchObject({
      houseNumber: stored.housenumber,
      houseNumberExtension: stored.housenumberextension,
    });
  });
});
