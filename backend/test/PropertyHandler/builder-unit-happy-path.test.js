jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => "test"),
}));
jest.mock("../../ORM/index.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn().mockResolvedValue({
            getRepository: jest.fn(() => ({
                find: jest.fn().mockResolvedValue([]),
                findOneBy: jest.fn().mockResolvedValue({}),
                createQueryBuilder: jest.fn(() => ({
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue({}),
                })),
            })),
            isInitialized: true,
            initialize: jest.fn(),
            destroy: jest.fn(),
        }),
    },
}));

import {describe, it, expect, beforeEach} from "@jest/globals";
import {PropertyBuilder} from "../../functions/PropertyHandler/business/service/propertyBuilder.js";
import {getPropertyObject} from "./events/propertyObject.js";

describe("PropertyBuilder unit tests (happy path)", () => {
    let builder;
    let propertyObj;

    beforeEach(() => {
        builder = new PropertyBuilder();
        builder.property = {id: "test"};
        propertyObj = getPropertyObject();
    });

    it("adds base property info", async () => {
        await builder.addBasePropertyInfo(propertyObj.property, "Boat", "test");

        expect(builder.property).toMatchObject({
            id: "test",
            hostId: "test",
            status: "INACTIVE",
            title: "test",
            subtitle: "test",
            description: "test",
            registrationNumber: "test"
        });

        expect(typeof builder.property.createdAt).toBe("number");
    });


    it("adds amenities", async () => {
        await builder.addAmenities(propertyObj.propertyAmenities);
        expect(builder.propertyAmenities).toEqual(propertyObj.propertyAmenities);
    });

    it("adds availability", () => {
        builder.addAvailability(propertyObj.propertyAvailability);
        expect(builder.propertyAvailabilities).toEqual(propertyObj.propertyAvailability);
    });

    it("adds availability restrictions", async () => {
        await builder.addAvailabilityRestrictions({restriction: "MaximumNightsPerYear", value: 30});
        expect(builder.propertyAvailabilityRestrictions).toEqual([{
            id: "test",
            property_id: "test",
            restriction: "MaximumNightsPerYear",
            value: 30
        }]);
    });

    it("adds check-in/check-out info", () => {
        builder.addCheckIn(propertyObj.propertyCheckIn);
        expect(builder.propertyCheckIn).toEqual(propertyObj.propertyCheckIn);
    });

    it("adds general details", async () => {
        await builder.addGeneralDetails(propertyObj.propertyGeneralDetails);
        expect(builder.propertyGeneralDetails).toEqual(propertyObj.propertyGeneralDetails);
    });

    it("adds location", () => {
        builder.addLocation(propertyObj.propertyLocation);
        expect(builder.propertyLocation).toEqual(propertyObj.propertyLocation);
    });

    it("adds pricing", () => {
        builder.addPricing(propertyObj.propertyPricing);
        expect(builder.propertyPricing).toEqual(propertyObj.propertyPricing);
    });

    it("adds rules", async () => {
        await builder.addRules(propertyObj.propertyRules);
        expect(builder.propertyRules).toEqual(propertyObj.propertyRules);
    });

    it("adds property type", () => {
        builder.addPropertyType(propertyObj.propertyType);
        expect(builder.propertyType).toEqual(propertyObj.propertyType);
    });

    it("adds images", () => {
        builder.addImages(propertyObj.propertyImages);
        expect(builder.propertyImages).toEqual(propertyObj.propertyImages);
    });

    it("adds technical details", async () => {
        await builder.addTechnicalDetails(propertyObj.propertyTechnicalDetails);
        expect(builder.propertyTechnicalDetails).toEqual(propertyObj.propertyTechnicalDetails);
    });

    it("builds the complete property object", async () => {
        await builder.addBasePropertyInfo(propertyObj.property, propertyObj.propertyType.property_type, "test");

        builder
            .addAvailability(propertyObj.propertyAvailability)
            .addCheckIn(propertyObj.propertyCheckIn)
            .addLocation(propertyObj.propertyLocation)
            .addPricing(propertyObj.propertyPricing)
            .addImages(propertyObj.propertyImages)
            .addPropertyType(propertyObj.propertyType);

        await builder.addAmenities(propertyObj.propertyAmenities);
        await builder.addGeneralDetails(propertyObj.propertyGeneralDetails);
        await builder.addRules(propertyObj.propertyRules);
        await builder.addAvailabilityRestrictions({restriction: "MaximumNightsPerYear", value: 30});

        if (builder.propertyType.property_type === "Boat" || builder.propertyType.property_type === "Camper") {
            builder.addTechnicalDetails(propertyObj.propertyTechnicalDetails)
        }
        const result = builder.build();
        expect(result).toBeTruthy();
    });
});
