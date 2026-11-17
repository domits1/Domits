import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const TECHNICAL_DETAILS = { fuel: "diesel" };

const buildService = (propertyType) => {
  const service = new PropertyService();
  service.getBasePropertyInfo = jest.fn(async () => ({ id: "property-1" }));
  service.getAmenities = jest.fn(async () => []);
  service.getAvailability = jest.fn(async () => []);
  service.getAvailabilityRestrictions = jest.fn(async () => []);
  service.getCheckIn = jest.fn(async () => ({ checkIn: {} }));
  service.getGeneralDetails = jest.fn(async () => []);
  service.getImages = jest.fn(async () => []);
  service.getLocation = jest.fn(async () => ({}));
  service.getFullLocation = jest.fn(async () => ({}));
  service.getPricing = jest.fn(async () => ({}));
  service.getRules = jest.fn(async () => []);
  service.getPropertyType = jest.fn(async () => propertyType);
  service.getPropertyTestStatus = jest.fn(async () => null);
  service.getCancellationPolicy = jest.fn(async () => null);
  service.getLateCheckin = jest.fn(async () => null);
  service.getHouseRules = jest.fn(async () => []);
  service.getCustomRules = jest.fn(async () => []);
  service.getTechnicalDetails = jest.fn(async () => TECHNICAL_DETAILS);
  return service;
};

describe("PropertyService.getFullPropertyAttributes technical details", () => {
  it.each([undefined, null])("resolves without technical details when the property type is %s", async (missingType) => {
    const service = buildService(missingType);

    const result = await service.getFullPropertyAttributes("property-1");

    expect(result.propertyType).toBe(missingType);
    expect(result.technicalDetails).toBeNull();
    expect(service.getTechnicalDetails).not.toHaveBeenCalled();
  });

  it("does not load technical details for a House", async () => {
    const service = buildService({ property_type: "House" });

    const result = await service.getFullPropertyAttributes("property-1");

    expect(result.technicalDetails).toBeNull();
    expect(service.getTechnicalDetails).not.toHaveBeenCalled();
  });

  it("resolves a missing property type through the full-location variant too", async () => {
    const service = buildService(undefined);

    const result = await service.getFullPropertyAttributesWithFullLocation("property-1");

    expect(result.technicalDetails).toBeNull();
  });
});
