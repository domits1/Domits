import { describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const PROPERTY_ID = "property-1";

const buildListing = (propertyType = "House") => ({
  property: { id: PROPERTY_ID, title: "Cliff House", hostId: "host-1" },
  propertyAmenities: [
    { id: "pa-1", amenityId: "wifi", property_id: PROPERTY_ID },
    { id: "pa-2", amenityId: "pool", property_id: PROPERTY_ID },
  ],
  propertyAvailabilities: [{ property_id: PROPERTY_ID, availableStartDate: 1, availableEndDate: 2 }],
  propertyCheckIn: { property_id: PROPERTY_ID, checkIn: { from: "15:00", till: "20:00" }, checkOut: {} },
  propertyGeneralDetails: [
    { id: "gd-1", property_id: PROPERTY_ID, detail: "Guests", value: 4 },
    { id: "gd-2", property_id: PROPERTY_ID, detail: "Bedrooms", value: 2 },
  ],
  propertyLocation: { property_id: PROPERTY_ID, city: "Phuket", country: "Thailand" },
  propertyPricing: { property_id: PROPERTY_ID, roomRate: 120, cleaning: 30 },
  propertyRules: [{ property_id: PROPERTY_ID, rule: "SmokingAllowed", value: false }],
  propertyType: { property_id: PROPERTY_ID, property_type: propertyType, spaceType: "Entire place" },
  propertyAvailabilityRestrictions: [{ id: "ar-1", property_id: PROPERTY_ID, restriction: "MinimumStay", value: 2 }],
  propertyTestStatus: { property_id: PROPERTY_ID, isTest: false },
  propertyImages: [
    { property_id: PROPERTY_ID, image: "data:image/png;base64,AAAA" },
    { property_id: PROPERTY_ID, image: "data:image/png;base64,BBBB" },
  ],
  propertyTechnicalDetails: { property_id: PROPERTY_ID, length: 8 },
});

// Every repository answers a truthy row, like the real ones after their read-back.
// `calls` records the order in which the writes start.
const buildService = () => {
  const calls = [];
  const writer = (name) => ({
    create: jest.fn(async () => {
      calls.push(name);
      return { saved: true };
    }),
  });

  const service = new PropertyService();
  service.propertyRepository = writer("property");
  service.propertyAmenityRepository = writer("amenity");
  service.propertyAvailabilityRepository = writer("availability");
  service.propertyCheckInRepository = writer("checkIn");
  service.propertyGeneralDetailRepository = writer("generalDetail");
  service.propertyLocationRepository = writer("location");
  service.propertyPricingRepository = writer("pricing");
  service.propertyRuleRepository = writer("rule");
  service.propertyTypeRepository = writer("type");
  service.propertyAvailabilityRestrictionRepository = writer("restriction");
  service.propertyTestStatusRepository = writer("testStatus");
  service.propertyImageRepository = writer("image");
  service.propertyTechnicalDetailRepository = writer("technicalDetail");
  service.destinationMappingService = {
    mapPropertyLocationSafely: jest.fn(async () => {
      calls.push("destination");
      return { outcome: "mapped" };
    }),
  };
  return { service, calls };
};

describe("PropertyService.create", () => {
  it("saves the base listing first, then every child once with its own payload", async () => {
    const listing = buildListing();
    const { service, calls } = buildService();

    await service.create(listing);

    expect(calls[0]).toBe("property");
    expect(service.propertyRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyRepository.create).toHaveBeenCalledWith(listing.property);

    expect(service.propertyAmenityRepository.create).toHaveBeenCalledTimes(2);
    expect(service.propertyAmenityRepository.create).toHaveBeenNthCalledWith(1, listing.propertyAmenities[0]);
    expect(service.propertyAmenityRepository.create).toHaveBeenNthCalledWith(2, listing.propertyAmenities[1]);
    expect(service.propertyAvailabilityRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyAvailabilityRepository.create).toHaveBeenCalledWith(listing.propertyAvailabilities[0]);
    expect(service.propertyCheckInRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyCheckInRepository.create).toHaveBeenCalledWith(listing.propertyCheckIn);
    expect(service.propertyGeneralDetailRepository.create).toHaveBeenCalledTimes(2);
    expect(service.propertyGeneralDetailRepository.create).toHaveBeenNthCalledWith(1, listing.propertyGeneralDetails[0]);
    expect(service.propertyGeneralDetailRepository.create).toHaveBeenNthCalledWith(2, listing.propertyGeneralDetails[1]);
    expect(service.propertyLocationRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyLocationRepository.create).toHaveBeenCalledWith(listing.propertyLocation);
    expect(service.propertyPricingRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyPricingRepository.create).toHaveBeenCalledWith(listing.propertyPricing);
    expect(service.propertyRuleRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyRuleRepository.create).toHaveBeenCalledWith(listing.propertyRules[0]);
    expect(service.propertyTypeRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyTypeRepository.create).toHaveBeenCalledWith(listing.propertyType);
    expect(service.propertyAvailabilityRestrictionRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyAvailabilityRestrictionRepository.create).toHaveBeenCalledWith(
      listing.propertyAvailabilityRestrictions[0]
    );
    expect(service.propertyTestStatusRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyTestStatusRepository.create).toHaveBeenCalledWith(listing.propertyTestStatus);
    expect(service.propertyImageRepository.create).toHaveBeenCalledTimes(2);
    expect(service.propertyImageRepository.create).toHaveBeenNthCalledWith(1, listing.propertyImages[0]);
    expect(service.propertyImageRepository.create).toHaveBeenNthCalledWith(2, listing.propertyImages[1]);
  });

  it("starts no child write before the base listing is saved", async () => {
    const { service, calls } = buildService();
    let releaseBase;
    service.propertyRepository.create = jest.fn(
      () =>
        new Promise((resolve) => {
          releaseBase = () => resolve({ saved: true });
        })
    );

    const pending = service.create(buildListing());
    await new Promise((resolve) => setImmediate(resolve));
    expect(calls).toEqual([]);

    releaseBase();
    await pending;
    expect(calls).toEqual(expect.arrayContaining(["amenity", "location", "pricing"]));
  });

  it("maps the destination of the new location only after the location is saved", async () => {
    const { service, calls } = buildService();

    await service.create(buildListing());

    expect(service.destinationMappingService.mapPropertyLocationSafely).toHaveBeenCalledWith(PROPERTY_ID);
    expect(calls.indexOf("destination")).toBeGreaterThan(calls.indexOf("location"));
  });

  it.each(["Boat", "Camper"])("saves technical details for property type %s", async (propertyType) => {
    const listing = buildListing(propertyType);
    const { service } = buildService();

    await service.create(listing);

    expect(service.propertyTechnicalDetailRepository.create).toHaveBeenCalledTimes(1);
    expect(service.propertyTechnicalDetailRepository.create).toHaveBeenCalledWith(listing.propertyTechnicalDetails);
  });

  it.each(["House", "Apartment"])("does not save technical details for property type %s", async (propertyType) => {
    const { service } = buildService();

    await service.create(buildListing(propertyType));

    expect(service.propertyTechnicalDetailRepository.create).not.toHaveBeenCalled();
  });

  it("skips the image write when skipImages is set, and still saves everything else", async () => {
    const { service, calls } = buildService();

    await service.create(buildListing(), { skipImages: true });

    expect(service.propertyImageRepository.create).not.toHaveBeenCalled();
    expect(calls).toEqual(expect.arrayContaining(["property", "amenity", "location", "pricing", "type"]));
  });
});
