import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { DatabaseException } from "../../functions/PropertyHandler/util/exception/DatabaseException.js";
import { getPropertyObject } from "./events/propertyObject.js";

describe("PropertyService general detail flow", () => {
  const generalDetails = getPropertyObject().propertyGeneralDetails;

  it("delegates createGeneralDetail to the general detail repository for each detail", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyGeneralDetailRepository = {
      create: jest.fn().mockResolvedValue(generalDetails[0]),
    };

    await expect(service.createGeneralDetail(generalDetails)).resolves.toBeUndefined();
    expect(service.propertyGeneralDetailRepository.create).toHaveBeenCalledTimes(generalDetails.length);
    expect(service.propertyGeneralDetailRepository.create).toHaveBeenCalledWith(generalDetails[0]);
  });

  it("throws when createGeneralDetail does not get a stored result back", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyGeneralDetailRepository = {
      create: jest.fn().mockResolvedValue(null),
    };

    await expect(service.createGeneralDetail(generalDetails)).rejects.toThrow(DatabaseException);
  });

  it("delegates getGeneralDetails to the general detail repository", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyGeneralDetailRepository = {
      getPropertyGeneralDetailsByPropertyId: jest.fn().mockResolvedValue(generalDetails),
    };

    await expect(service.getGeneralDetails("prop-1")).resolves.toEqual(generalDetails);
    expect(service.propertyGeneralDetailRepository.getPropertyGeneralDetailsByPropertyId).toHaveBeenCalledWith("prop-1");
  });

  it("maps capacity fields to general detail names during updateCapacity", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyGeneralDetailRepository = {
      upsertPropertyGeneralDetailsByPropertyId: jest.fn().mockResolvedValue(generalDetails),
    };
    service.propertyTypeRepository = {
      updatePropertySpaceTypeByPropertyId: jest.fn().mockResolvedValue({}),
    };

    await service.updateCapacity("prop-1", {
      guests: 4,
      bedrooms: 2,
      beds: 5,
      bathrooms: 1,
    });

    expect(service.propertyGeneralDetailRepository.upsertPropertyGeneralDetailsByPropertyId).toHaveBeenCalledWith(
      "prop-1",
      [
        { detail: "Guests", value: 4 },
        { detail: "Bedrooms", value: 2 },
        { detail: "Beds", value: 5 },
        { detail: "Bathrooms", value: 1 },
      ]
    );
    expect(service.propertyTypeRepository.updatePropertySpaceTypeByPropertyId).not.toHaveBeenCalled();
  });

  it("updates space type separately while still upserting general details during updateCapacity", async () => {
    const service = Object.create(PropertyService.prototype);
    service.propertyGeneralDetailRepository = {
      upsertPropertyGeneralDetailsByPropertyId: jest.fn().mockResolvedValue(generalDetails),
    };
    service.propertyTypeRepository = {
      updatePropertySpaceTypeByPropertyId: jest.fn().mockResolvedValue({}),
    };

    await service.updateCapacity("prop-1", {
      spaceType: " Full House ",
      guests: 6,
    });

    expect(service.propertyTypeRepository.updatePropertySpaceTypeByPropertyId).toHaveBeenCalledWith(
      "prop-1",
      "Full House"
    );
    expect(service.propertyGeneralDetailRepository.upsertPropertyGeneralDetailsByPropertyId).toHaveBeenCalledWith(
      "prop-1",
      [{ detail: "Guests", value: 6 }]
    );
  });
});
