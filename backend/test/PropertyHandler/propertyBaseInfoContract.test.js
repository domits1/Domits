import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyBaseInfoMapping } from "../../functions/PropertyHandler/util/mapping/propertyBaseInfo.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const buildEntry = (registrationnumber) => ({
  id: "11111111-1111-4111-8111-111111111111",
  hostid: "00000000-0000-4000-8000-000000000001",
  title: "Test Villa ",
  subtitle: "Algarve",
  description: "Short test description.",
  registrationnumber,
  status: "INACTIVE",
  createdat: 1773316890605,
  updatedat: 0,
  bookingtype: "direct",
});

describe("PropertyBaseInfoMapping JSON contract", () => {
  it.each([
    ["a real number", "NL-1234"],
    ["the generated placeholder", "AUTO-11111111-1111-4111-8111-111111111111"],
    ["an empty string", ""],
  ])("keeps registrationNumber as a camelCase string key after JSON.stringify for %s", (_label, stored) => {
    const mapped = PropertyBaseInfoMapping.mapDatabaseEntryToPropertyBaseInfo(buildEntry(stored));

    const serialized = JSON.parse(JSON.stringify(mapped));

    expect(Object.keys(serialized)).toContain("registrationNumber");
    expect(serialized.registrationNumber).toBe(stored);
    expect(serialized).not.toHaveProperty("registrationnumber");
  });
});

describe("GET /property/hostDashboard/all response body", () => {
  let controller;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    controller = new PropertyController();
    controller.authManager = { authorizeGroupRequest: jest.fn().mockResolvedValue("host-1") };
  });

  it("exposes property.registrationNumber for every listing", async () => {
    const stored = ["NL-1234", "AUTO-11111111-1111-4111-8111-111111111111"];
    controller.propertyService = {
      getFullPropertiesByHostId: jest.fn().mockResolvedValue(
        stored.map((registrationnumber) => ({
          property: PropertyBaseInfoMapping.mapDatabaseEntryToPropertyBaseInfo(buildEntry(registrationnumber)),
          location: { property_id: "11111111-1111-4111-8111-111111111111", country: "Portugal", city: "Algarve" },
        }))
      ),
    };

    const response = await controller.getFullOwnedProperties({ headers: { Authorization: "token" } });

    expect(response.statusCode).toBe(200);
    const listings = JSON.parse(response.body);
    expect(listings.map((listing) => listing.property.registrationNumber)).toEqual(stored);
    expect(listings[0].location.city).toBe("Algarve");
  });
});
