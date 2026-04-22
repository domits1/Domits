import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { DatabaseException } from "../../functions/PropertyHandler/util/exception/DatabaseException.js";
import { getPropertyObject } from "./events/propertyObject.js";

describe("PropertyService technical details flow", () => {
  const technicalDetails = getPropertyObject().propertyTechnicalDetails;

  it("delegates createTechnicalDetails to the technical detail repository", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyTechnicalDetailRepository = {
      create: jest.fn().mockResolvedValue(technicalDetails),
    };

    await expect(service.createTechnicalDetails(technicalDetails)).resolves.toBeUndefined();
    expect(service.propertyTechnicalDetailRepository.create).toHaveBeenCalledWith(technicalDetails);
  });

  it("throws when createTechnicalDetails does not get a stored result back", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyTechnicalDetailRepository = {
      create: jest.fn().mockResolvedValue(null),
    };

    await expect(service.createTechnicalDetails(technicalDetails)).rejects.toThrow(DatabaseException);
  });

  it("delegates getTechnicalDetails to the technical detail repository", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyTechnicalDetailRepository = {
      getTechnicalDetailsByPropertyId: jest.fn().mockResolvedValue(technicalDetails),
    };

    await expect(service.getTechnicalDetails("prop-1")).resolves.toEqual(technicalDetails);
    expect(service.propertyTechnicalDetailRepository.getTechnicalDetailsByPropertyId).toHaveBeenCalledWith("prop-1");
  });

  it("creates technical details during property creation for Boat properties", async () => {
    const service = Object.create(PropertyService.prototype);
    const property = {
      ...getPropertyObject(),
      propertyType: {
        property_type: "Boat",
      },
    };

    service.createBasePropertyInfo = jest.fn().mockResolvedValue();
    service.createAmenities = jest.fn().mockResolvedValue();
    service.createAvailability = jest.fn().mockResolvedValue();
    service.createCheckIn = jest.fn().mockResolvedValue();
    service.createGeneralDetail = jest.fn().mockResolvedValue();
    service.createLocation = jest.fn().mockResolvedValue();
    service.createPricing = jest.fn().mockResolvedValue();
    service.createRules = jest.fn().mockResolvedValue();
    service.createPropertyType = jest.fn().mockResolvedValue();
    service.createAvailabilityRestrictions = jest.fn().mockResolvedValue();
    service.createPropertyTestStatus = jest.fn().mockResolvedValue();
    service.createImages = jest.fn().mockResolvedValue();
    service.createTechnicalDetails = jest.fn().mockResolvedValue();

    await service.create(property, { skipImages: true });

    expect(service.createTechnicalDetails).toHaveBeenCalledWith(property.propertyTechnicalDetails);
    expect(service.createImages).not.toHaveBeenCalled();
  });

  it("does not create technical details during property creation for non-Boat/Camper properties", async () => {
    const service = Object.create(PropertyService.prototype);
    const property = {
      ...getPropertyObject(),
      propertyType: {
        property_type: "House",
      },
    };

    service.createBasePropertyInfo = jest.fn().mockResolvedValue();
    service.createAmenities = jest.fn().mockResolvedValue();
    service.createAvailability = jest.fn().mockResolvedValue();
    service.createCheckIn = jest.fn().mockResolvedValue();
    service.createGeneralDetail = jest.fn().mockResolvedValue();
    service.createLocation = jest.fn().mockResolvedValue();
    service.createPricing = jest.fn().mockResolvedValue();
    service.createRules = jest.fn().mockResolvedValue();
    service.createPropertyType = jest.fn().mockResolvedValue();
    service.createAvailabilityRestrictions = jest.fn().mockResolvedValue();
    service.createPropertyTestStatus = jest.fn().mockResolvedValue();
    service.createImages = jest.fn().mockResolvedValue();
    service.createTechnicalDetails = jest.fn().mockResolvedValue();

    await service.create(property, { skipImages: true });

    expect(service.createTechnicalDetails).not.toHaveBeenCalled();
  });

  it("includes technical details in full property reads for Camper properties", async () => {
    const service = Object.create(PropertyService.prototype);

    service.getBasePropertyInfo = jest.fn().mockResolvedValue({ id: "prop-1" });
    service.getAmenities = jest.fn().mockResolvedValue([]);
    service.getAvailability = jest.fn().mockResolvedValue([]);
    service.getAvailabilityRestrictions = jest.fn().mockResolvedValue([]);
    service.getCheckIn = jest.fn().mockResolvedValue({});
    service.getGeneralDetails = jest.fn().mockResolvedValue([]);
    service.getImages = jest.fn().mockResolvedValue([]);
    service.getLocation = jest.fn().mockResolvedValue({});
    service.getFullLocation = jest.fn().mockResolvedValue({});
    service.getPricing = jest.fn().mockResolvedValue({});
    service.getRules = jest.fn().mockResolvedValue([]);
    service.getPropertyType = jest.fn().mockResolvedValue({ property_type: "Camper" });
    service.getPropertyTestStatus = jest.fn().mockResolvedValue({});
    service.getTechnicalDetails = jest.fn().mockResolvedValue(technicalDetails);
    service.getPublicCalendarAvailability = jest.fn().mockResolvedValue({});

    const result = await service.getFullPropertyAttributesInternal("prop-1", false);

    expect(service.getTechnicalDetails).toHaveBeenCalledWith("prop-1");
    expect(result.technicalDetails).toEqual(technicalDetails);
  });

  it("does not load technical details in full property reads for non-Boat/Camper properties", async () => {
    const service = Object.create(PropertyService.prototype);

    service.getBasePropertyInfo = jest.fn().mockResolvedValue({ id: "prop-1" });
    service.getAmenities = jest.fn().mockResolvedValue([]);
    service.getAvailability = jest.fn().mockResolvedValue([]);
    service.getAvailabilityRestrictions = jest.fn().mockResolvedValue([]);
    service.getCheckIn = jest.fn().mockResolvedValue({});
    service.getGeneralDetails = jest.fn().mockResolvedValue([]);
    service.getImages = jest.fn().mockResolvedValue([]);
    service.getLocation = jest.fn().mockResolvedValue({});
    service.getFullLocation = jest.fn().mockResolvedValue({});
    service.getPricing = jest.fn().mockResolvedValue({});
    service.getRules = jest.fn().mockResolvedValue([]);
    service.getPropertyType = jest.fn().mockResolvedValue({ property_type: "House" });
    service.getPropertyTestStatus = jest.fn().mockResolvedValue({});
    service.getTechnicalDetails = jest.fn();
    service.getPublicCalendarAvailability = jest.fn().mockResolvedValue({});

    const result = await service.getFullPropertyAttributesInternal("prop-1", false);

    expect(service.getTechnicalDetails).not.toHaveBeenCalled();
    expect(result.technicalDetails).toBeNull();
  });
});
