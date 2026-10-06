import { describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const LOCATION = { property_id: "property-1", country: "Spain", city: "Marbella", street: "Calle 1", houseNumber: 1 };

const buildService = ({ stored = LOCATION } = {}) => {
  const service = new PropertyService();
  service.propertyLocationRepository = {
    create: jest.fn(async () => stored),
    updatePropertyLocationById: jest.fn(async () => stored),
  };
  service.destinationMappingService = { mapPropertyLocationSafely: jest.fn(async () => ({ outcome: "mapped" })) };
  return service;
};

describe("the destination mapping follows every location write", () => {
  it("maps the destination by property id right after a location is created or updated, never from the returned model", async () => {
    const service = buildService({ stored: { ...LOCATION, country: "Spain", city: "Malaga" } });

    await service.createLocation(LOCATION);
    await service.updateLocation("property-1", { ...LOCATION, country: "spain", city: "malaga" });

    expect(service.destinationMappingService.mapPropertyLocationSafely.mock.calls).toEqual([
      ["property-1"],
      ["property-1"],
    ]);
  });

  it("does not map anything when the location write itself failed", async () => {
    const service = buildService({ stored: null });

    await expect(service.createLocation(LOCATION)).rejects.toThrow("Failed to register property location.");
    await expect(service.updateLocation("property-1", LOCATION)).rejects.toThrow("Failed to update property location.");
    expect(service.destinationMappingService.mapPropertyLocationSafely).not.toHaveBeenCalled();
  });
});
