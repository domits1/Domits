import { describe, it, expect, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";

const buildService = (bookingStatus) => {
  const service = new PropertyService();
  service.bookingRepository = {
    getBookingById: jest.fn(async () => ({ status: bookingStatus, property_id: "property-1" })),
  };
  service.getBasePropertyInfo = jest.fn(async () => ({ id: "property-1" }));
  service.getFullPropertyAttributesWithFullLocation = jest.fn(async () => ({ property: { id: "property-1" } }));
  return service;
};

describe("PropertyService.getFullPropertyByBookingId booking status gate", () => {
  it.each(["Paid", "Inquiry", "Awaiting Payment"])(
    "allows a %s booking to load full property details",
    async (status) => {
      const service = buildService(status);

      const result = await service.getFullPropertyByBookingId("booking-1");

      expect(result).toEqual({ property: { id: "property-1" } });
      expect(service.getFullPropertyAttributesWithFullLocation).toHaveBeenCalledWith("property-1");
    }
  );

  it.each(["Cancelled", "Canceled", "Declined", "Failed", "cancelled", "DECLINED"])(
    "blocks a %s booking with Forbidden",
    async (status) => {
      const service = buildService(status);

      await expect(service.getFullPropertyByBookingId("booking-1")).rejects.toBeInstanceOf(Forbidden);
      expect(service.getFullPropertyAttributesWithFullLocation).not.toHaveBeenCalled();
    }
  );
});
