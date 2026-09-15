import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { DatabaseException } from "../../functions/PropertyHandler/util/exception/DatabaseException.js";
import { getPropertyObject } from "./events/propertyObject.js";

describe("PropertyService availability restriction flow", () => {
  const restrictions = getPropertyObject().propertyAvailabilityRestrictions;

  it("delegates createAvailabilityRestrictions to the repository for each restriction", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyAvailabilityRestrictionRepository = {
      create: jest.fn().mockResolvedValue(restrictions[0]),
    };

    await expect(service.createAvailabilityRestrictions(restrictions)).resolves.toBeUndefined();
    expect(service.propertyAvailabilityRestrictionRepository.create).toHaveBeenCalledTimes(restrictions.length);
    expect(service.propertyAvailabilityRestrictionRepository.create).toHaveBeenCalledWith(restrictions[0]);
  });

  it("throws when createAvailabilityRestrictions does not get a stored result back", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyAvailabilityRestrictionRepository = {
      create: jest.fn().mockResolvedValue(null),
    };

    await expect(service.createAvailabilityRestrictions(restrictions)).rejects.toThrow(DatabaseException);
  });

  it("delegates getAvailabilityRestrictions to the repository", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyAvailabilityRestrictionRepository = {
      getAvailabilityRestrictionsByPropertyId: jest.fn().mockResolvedValue(restrictions),
    };

    await expect(service.getAvailabilityRestrictions("prop-1")).resolves.toEqual(restrictions);
    expect(service.propertyAvailabilityRestrictionRepository.getAvailabilityRestrictionsByPropertyId).toHaveBeenCalledWith(
      "prop-1"
    );
  });

  it("delegates updateAvailabilityRestrictions to the repository replace flow", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyAvailabilityRestrictionRepository = {
      replaceRestrictionsByPropertyId: jest.fn().mockResolvedValue(restrictions),
    };

    await expect(service.updateAvailabilityRestrictions("prop-1", restrictions)).resolves.toEqual(restrictions);
    expect(service.propertyAvailabilityRestrictionRepository.replaceRestrictionsByPropertyId).toHaveBeenCalledWith(
      "prop-1",
      restrictions
    );
  });
});
