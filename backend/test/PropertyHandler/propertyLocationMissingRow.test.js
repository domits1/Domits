import { describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const LOCATION = {
  street: "Patak Soi 2",
  houseNumber: "11",
  postalCode: "83100",
  city: "Phuket",
  country: "Thailand",
};

const buildService = ({ existing }) => {
  const service = new PropertyService();
  service.propertyLocationRepository = {
    getPropertyLocationById: jest.fn(async () => existing),
    create: jest.fn(async (location) => location),
    updatePropertyLocationById: jest.fn(async () => ({ ...LOCATION, property_id: "property-1" })),
  };
  service.destinationMappingService = { mapPropertyLocationSafely: jest.fn(async () => ({ outcome: "mapped" })) };
  return service;
};

// A listing can exist without a location row; the edit form then showed "Unknown city" and
// every save failed with "Failed to update property location", because there was nothing to update.
describe("saving the location of a listing that has none yet", () => {
  it("creates the location instead of failing", async () => {
    const service = buildService({ existing: null });

    await service.updateLocation("property-1", LOCATION);

    expect(service.propertyLocationRepository.create).toHaveBeenCalledWith({ ...LOCATION, property_id: "property-1" });
    expect(service.propertyLocationRepository.updatePropertyLocationById).not.toHaveBeenCalled();
    expect(service.destinationMappingService.mapPropertyLocationSafely).toHaveBeenCalledWith("property-1");
  });

  it("still updates a location that exists", async () => {
    const service = buildService({ existing: { ...LOCATION, city: "Kata" } });

    await service.updateLocation("property-1", LOCATION);

    expect(service.propertyLocationRepository.updatePropertyLocationById).toHaveBeenCalledWith("property-1", LOCATION);
    expect(service.propertyLocationRepository.create).not.toHaveBeenCalled();
  });
});
