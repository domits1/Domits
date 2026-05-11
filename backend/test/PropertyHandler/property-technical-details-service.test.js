import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { DatabaseException } from "../../functions/PropertyHandler/util/exception/DatabaseException.js";
import { getPropertyObject } from "./events/propertyObject.js";

describe("PropertyService technical details flow", () => {
  const propertyId = "prop-1";
  const propertyObject = getPropertyObject();
  const technicalDetails = propertyObject.propertyTechnicalDetails;
  const mockPropertyRuleRepository = {
    getRulesByPropertyId: jest.fn(),
  };
  const createResolvedMock = (value = undefined) => jest.fn().mockResolvedValue(value);

  const createService = (overrides = {}) =>
    Object.assign(
      Object.create(PropertyService.prototype),
      {
        propertyRuleRepository: mockPropertyRuleRepository,
      },
      overrides
    );

  const createBaseProperty = (propertyType, overrides = {}) => ({
    ...propertyObject,
    propertyType: {
      ...propertyObject.propertyType,
      property_type: propertyType,
    },
    ...overrides,
  });

  const mockCreateFlow = (service, overrides = {}) =>
    Object.assign(service, {
      createBasePropertyInfo: createResolvedMock(),
      createAmenities: createResolvedMock(),
      createAvailability: createResolvedMock(),
      createCheckIn: createResolvedMock(),
      createGeneralDetail: createResolvedMock(),
      createLocation: createResolvedMock(),
      createPricing: createResolvedMock(),
      createRules: createResolvedMock(),
      createPropertyType: createResolvedMock(),
      createAvailabilityRestrictions: createResolvedMock(),
      createPropertyTestStatus: createResolvedMock(),
      createImages: createResolvedMock(),
      createTechnicalDetails: createResolvedMock(),
      ...overrides,
    });

  const mockFullPropertyReadData = (service, overrides = {}) =>
    Object.assign(service, {
      getBasePropertyInfo: createResolvedMock({ id: propertyId }),
      getAmenities: createResolvedMock([]),
      getAvailability: createResolvedMock([]),
      getAvailabilityRestrictions: createResolvedMock([]),
      getCheckIn: createResolvedMock({}),
      getGeneralDetails: createResolvedMock([]),
      getImages: createResolvedMock([]),
      getLocation: createResolvedMock({}),
      getFullLocation: createResolvedMock({}),
      getPricing: createResolvedMock({}),
      getRules: createResolvedMock([]),
      getPropertyType: createResolvedMock({ property_type: "House" }),
      getPropertyTestStatus: createResolvedMock({}),
      getTechnicalDetails: createResolvedMock(technicalDetails),
      getPublicCalendarAvailability: createResolvedMock({}),
      ...overrides,
    });

  beforeEach(() => {
    mockPropertyRuleRepository.getRulesByPropertyId.mockReset();
    mockPropertyRuleRepository.getRulesByPropertyId.mockResolvedValue([]);
  });

  it("delegates createTechnicalDetails to the technical detail repository", async () => {
    const service = createService();
    service.propertyTechnicalDetailRepository = {
      create: jest.fn().mockResolvedValue(technicalDetails),
    };

    await expect(service.createTechnicalDetails(technicalDetails)).resolves.toBeUndefined();
    expect(service.propertyTechnicalDetailRepository.create).toHaveBeenCalledWith(technicalDetails);
  });

  it("throws when createTechnicalDetails does not get a stored result back", async () => {
    const service = createService();
    service.propertyTechnicalDetailRepository = {
      create: jest.fn().mockResolvedValue(null),
    };

    await expect(service.createTechnicalDetails(technicalDetails)).rejects.toThrow(DatabaseException);
  });

  it("delegates getTechnicalDetails to the technical detail repository", async () => {
    const service = createService();
    service.propertyTechnicalDetailRepository = {
      getTechnicalDetailsByPropertyId: createResolvedMock(technicalDetails),
    };

    await expect(service.getTechnicalDetails(propertyId)).resolves.toEqual(technicalDetails);
    expect(service.propertyTechnicalDetailRepository.getTechnicalDetailsByPropertyId).toHaveBeenCalledWith(propertyId);
  });

  it("creates technical details during property creation for Boat properties", async () => {
    const service = createService();
    const property = createBaseProperty("Boat");
    mockCreateFlow(service);

    await service.create(property, { skipImages: true });

    expect(service.createTechnicalDetails).toHaveBeenCalledWith(property.propertyTechnicalDetails);
    expect(service.createImages).not.toHaveBeenCalled();
  });

  it("does not create technical details during property creation for non-Boat/Camper properties", async () => {
    const service = createService();
    const property = createBaseProperty("House");
    mockCreateFlow(service);

    await service.create(property, { skipImages: true });

    expect(service.createTechnicalDetails).not.toHaveBeenCalled();
  });

  it("includes technical details in full property reads for Camper properties", async () => {
    const service = createService();
    mockFullPropertyReadData(service, {
      getPropertyType: createResolvedMock({ property_type: "Camper" }),
    });

    const result = await service.getFullPropertyAttributesInternal(propertyId, false);

    expect(service.getTechnicalDetails).toHaveBeenCalledWith(propertyId);
    expect(result.technicalDetails).toEqual(technicalDetails);
  });

  it("does not load technical details in full property reads for non-Boat/Camper properties", async () => {
    const service = createService();
    mockFullPropertyReadData(service, {
      getTechnicalDetails: jest.fn(),
    });

    const result = await service.getFullPropertyAttributesInternal(propertyId, false);

    expect(service.getTechnicalDetails).not.toHaveBeenCalled();
    expect(result.technicalDetails).toBeNull();
  });
});
