import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { geocodeAddress } from "../../functions/PropertyHandler/util/geocoding.js";
import { ServiceUnavailableException } from "../../functions/PropertyHandler/util/exception/ServiceUnavailableException.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

jest.mock("../../functions/PropertyHandler/util/geocoding.js", () => ({
  geocodeAddress: jest.fn(),
}));

const PROPERTY_ID = "property-1";
const COORDINATES = { latitude: 7.9, longitude: 98.3 };
const conflict = () => Object.assign(new Error("change conflicts with another transaction"), { code: "40001" });

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

const WRITE_ORDER = [
  "property",
  "type",
  "location",
  "generalDetail",
  "generalDetail",
  "pricing",
  "checkIn",
  "availability",
  "restriction",
  "amenity",
  "amenity",
  "rule",
  "testStatus",
  "image",
  "image",
];

// A fake database with real transaction semantics: a write made with the transaction manager is
// staged and only reaches `committed` when the callback succeeds and the commit does not conflict.
// A write made without a manager goes to `direct`, so a repository that was handed no manager shows up.
// PropertyRepository.withTransaction is the real one, so the real withDsqlRetry decides about retries.
const buildHarness = ({ failOn, failOnce = false, commitConflicts = 0, uploadFails = false } = {}) => {
  const events = [];
  const committed = [];
  const direct = [];
  const store = { transactionsOpened: 0, callbackRuns: 0, commitConflictsLeft: commitConflicts, failedOnce: false };

  Database.getInstance.mockResolvedValue({
    transaction: async (work) => {
      store.transactionsOpened += 1;
      events.push("begin");
      const manager = { pending: [] };
      try {
        store.callbackRuns += 1;
        await work(manager);
        if (store.commitConflictsLeft > 0) {
          store.commitConflictsLeft -= 1;
          throw conflict();
        }
      } catch (error) {
        events.push("rollback");
        throw error;
      }
      committed.push(...manager.pending);
      events.push("commit");
    },
  });

  const writer = (name) => ({
    create: jest.fn(async (entity, manager, options) => {
      events.push(name);
      const shouldFail = failOn === name && !(failOnce && store.failedOnce);
      if (shouldFail) {
        store.failedOnce = true;
        throw new Error(`${name} write failed`);
      }
      (manager ? manager.pending : direct).push({ name, entity, manager, options });
      return { saved: true };
    }),
  });

  const service = new PropertyService();
  service.propertyRepository = Object.assign(new PropertyRepository(), writer("property"));
  service.propertyAmenityRepository = writer("amenity");
  service.propertyAvailabilityRepository = writer("availability");
  service.propertyCheckInRepository = writer("checkIn");
  service.propertyGeneralDetailRepository = writer("generalDetail");
  service.propertyLocationRepository = writer("location");
  service.propertyPricingRepository = {
    ...writer("pricing"),
    warmProbes: jest.fn(async () => events.push("warm-pricing")),
  };
  service.propertyRuleRepository = {
    ...writer("rule"),
    warmProbes: jest.fn(async () => events.push("warm-rule")),
  };
  service.propertyTypeRepository = writer("type");
  service.propertyAvailabilityRestrictionRepository = writer("restriction");
  service.propertyTestStatusRepository = writer("testStatus");
  service.propertyTechnicalDetailRepository = writer("technicalDetail");
  service.propertyImageRepository = {
    ...writer("image"),
    uploadImageToS3: jest.fn(async () => {
      events.push("upload");
      if (uploadFails) throw new Error("S3 is down");
      return `images/${PROPERTY_ID}/uploaded-${events.filter((event) => event === "upload").length}`;
    }),
  };
  service.destinationMappingService = {
    mapPropertyLocationSafely: jest.fn(async () => {
      events.push("destination");
      return { outcome: "mapped" };
    }),
  };

  geocodeAddress.mockImplementation(async () => {
    events.push("geocode");
    return COORDINATES;
  });

  return { service, events, committed, direct, store };
};

describe("PropertyService.create transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes every row through one transaction manager, in order, and commits once", async () => {
    const listing = buildListing();
    const { service, committed, direct, events } = buildHarness();

    await service.create(listing);

    expect(committed.map((write) => write.name)).toEqual(WRITE_ORDER);
    // A repository that was not handed the manager would have written to `direct`.
    expect(direct).toEqual([]);
    expect(new Set(committed.map((write) => write.manager)).size).toBe(1);
    expect(events.filter((event) => event === "commit")).toHaveLength(1);
    expect(committed[0].entity).toBe(listing.property);
  });

  it("hands every child its own payload", async () => {
    const listing = buildListing();
    const { service, committed } = buildHarness();

    await service.create(listing);

    const payloads = (name) => committed.filter((write) => write.name === name).map((write) => write.entity);
    expect(payloads("amenity")).toEqual(listing.propertyAmenities);
    expect(payloads("generalDetail")).toEqual(listing.propertyGeneralDetails);
    expect(payloads("availability")).toEqual(listing.propertyAvailabilities);
    expect(payloads("restriction")).toEqual(listing.propertyAvailabilityRestrictions);
    expect(payloads("rule")).toEqual(listing.propertyRules);
    expect(payloads("location")).toEqual([listing.propertyLocation]);
    expect(payloads("pricing")).toEqual([listing.propertyPricing]);
    expect(payloads("checkIn")).toEqual([listing.propertyCheckIn]);
    expect(payloads("type")).toEqual([listing.propertyType]);
    expect(payloads("testStatus")).toEqual([listing.propertyTestStatus]);
    expect(payloads("image")).toEqual(listing.propertyImages);
  });

  it("warms the probes, geocodes and uploads before the transaction opens", async () => {
    const { service, events } = buildHarness();

    await service.create(buildListing());

    const begin = events.indexOf("begin");
    for (const early of ["warm-rule", "warm-pricing", "geocode", "upload"]) {
      expect(events.indexOf(early)).toBeGreaterThan(-1);
      expect(events.lastIndexOf(early)).toBeLessThan(begin);
    }
  });

  it("gives the location the coordinates found before the transaction, and each image its uploaded key", async () => {
    const { service, committed } = buildHarness();

    await service.create(buildListing());

    expect(committed.find((write) => write.name === "location").options).toEqual({ coordinates: COORDINATES });
    expect(committed.filter((write) => write.name === "image").map((write) => write.options.uploadedKey)).toEqual([
      `images/${PROPERTY_ID}/uploaded-1`,
      `images/${PROPERTY_ID}/uploaded-2`,
    ]);
  });

  it("still saves the listing when the address cannot be geocoded", async () => {
    const { service, committed } = buildHarness();
    geocodeAddress.mockResolvedValue(null);

    await service.create(buildListing());

    expect(committed.find((write) => write.name === "location").options).toEqual({ coordinates: null });
    expect(committed.map((write) => write.name)).toEqual(WRITE_ORDER);
  });

  it.each(["rule", "pricing", "amenity"])(
    "rolls everything back when the %s write fails in the middle, so no property row is left",
    async (failOn) => {
      const { service, committed, direct, events } = buildHarness({ failOn });

      await expect(service.create(buildListing())).rejects.toThrow(`${failOn} write failed`);

      expect(committed).toEqual([]);
      expect(direct).toEqual([]);
      expect(events).toContain("property");
      expect(events).toContain("rollback");
      expect(events).not.toContain("commit");
      expect(service.destinationMappingService.mapPropertyLocationSafely).not.toHaveBeenCalled();
    }
  );

  it("rolls the property back when the very last write, an image, fails", async () => {
    const { service, committed } = buildHarness({ failOn: "image" });

    await expect(service.create(buildListing())).rejects.toThrow("image write failed");

    expect(committed).toEqual([]);
  });

  it("runs the transaction again after a commit conflict and commits each row exactly once", async () => {
    const { service, committed, store } = buildHarness({ commitConflicts: 1 });

    await service.create(buildListing());

    expect(store.callbackRuns).toBe(2);
    expect(committed.map((write) => write.name)).toEqual(WRITE_ORDER);
    // Work done before the transaction is not repeated by a retry.
    expect(geocodeAddress).toHaveBeenCalledTimes(1);
    expect(service.propertyImageRepository.uploadImageToS3).toHaveBeenCalledTimes(2);
    expect(service.propertyRuleRepository.warmProbes).toHaveBeenCalledTimes(1);
    expect(committed.find((write) => write.name === "location").options).toEqual({ coordinates: COORDINATES });
    expect(service.destinationMappingService.mapPropertyLocationSafely).toHaveBeenCalledTimes(1);
  });

  it("answers 503 and commits nothing when the conflict does not go away", async () => {
    const { service, committed, store } = buildHarness({ commitConflicts: 10 });

    const failure = await service.create(buildListing()).catch((error) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(failure.statusCode).toBe(503);
    expect(failure.cause.code).toBe("40001");
    expect(committed).toEqual([]);
    expect(store.callbackRuns).toBe(3);
    expect(service.destinationMappingService.mapPropertyLocationSafely).not.toHaveBeenCalled();
  });

  it("does not retry an error that is not a commit conflict", async () => {
    const { service, store } = buildHarness({ failOn: "pricing" });

    await expect(service.create(buildListing())).rejects.toThrow("pricing write failed");

    expect(store.callbackRuns).toBe(1);
  });

  it("opens no transaction and writes nothing when the image upload fails", async () => {
    const { service, committed, direct, store } = buildHarness({ uploadFails: true });

    await expect(service.create(buildListing())).rejects.toThrow("S3 is down");

    expect(store.transactionsOpened).toBe(0);
    expect(committed).toEqual([]);
    expect(direct).toEqual([]);
  });

  it("maps the destination only after the commit", async () => {
    const { service, events } = buildHarness();

    await service.create(buildListing());

    expect(service.destinationMappingService.mapPropertyLocationSafely).toHaveBeenCalledWith(PROPERTY_ID);
    expect(events.indexOf("destination")).toBeGreaterThan(events.indexOf("commit"));
    expect(events.filter((event) => event === "destination")).toHaveLength(1);
  });

  it("keeps the listing when the destination mapping reports a failure", async () => {
    const { service, committed } = buildHarness();
    service.destinationMappingService.mapPropertyLocationSafely.mockResolvedValue({ outcome: "failed" });

    await expect(service.create(buildListing())).resolves.toBeUndefined();

    expect(committed.map((write) => write.name)).toEqual(WRITE_ORDER);
  });

  it.each(["Boat", "Camper"])("saves technical details inside the transaction for property type %s", async (type) => {
    const listing = buildListing(type);
    const { service, committed, direct } = buildHarness();

    await service.create(listing);

    const technical = committed.filter((write) => write.name === "technicalDetail");
    expect(technical).toHaveLength(1);
    expect(technical[0].entity).toBe(listing.propertyTechnicalDetails);
    expect(direct).toEqual([]);
  });

  it.each(["House", "Apartment"])("does not save technical details for property type %s", async (type) => {
    const { service, committed } = buildHarness();

    await service.create(buildListing(type));

    expect(committed.some((write) => write.name === "technicalDetail")).toBe(false);
  });

  it("rolls back technical details together with the rest when they fail", async () => {
    const { service, committed } = buildHarness({ failOn: "technicalDetail" });

    await expect(service.create(buildListing("Boat"))).rejects.toThrow("technicalDetail write failed");

    expect(committed).toEqual([]);
  });

  it("uploads and writes no image when skipImages is set, and still saves everything else", async () => {
    const { service, committed } = buildHarness();

    await service.create(buildListing(), { skipImages: true });

    expect(service.propertyImageRepository.uploadImageToS3).not.toHaveBeenCalled();
    expect(committed.map((write) => write.name)).toEqual(WRITE_ORDER.filter((name) => name !== "image"));
  });
});
