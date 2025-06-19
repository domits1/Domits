jest.mock("../../functions/PropertyHandler/data/repository/systemManagerRepository.js", () => ({
    SystemManagerRepository: jest.fn().mockImplementation(() => ({
        getPropertyTypeById: jest.fn().mockResolvedValue(null),
        getAmenityAndCategoryById: jest.fn().mockResolvedValue(null),
        getAvailabilityRestrictionById: jest.fn().mockResolvedValue(null),
        getGeneralDetailById: jest.fn().mockResolvedValue(null),
        getRuleById: jest.fn().mockResolvedValue(null),
    }))
}));

import {describe, it, expect} from "@jest/globals";
import {NotFoundException} from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import {TypeException} from "../../functions/PropertyHandler/util/exception/TypeException.js";
import {PropertyBuilder} from "../../functions/PropertyHandler/business/service/propertyBuilder.js";

describe("PropertyBuilder unit tests (unhappy paths)", () => {
    it("should throw NotFoundException when property type does not exist", async () => {
        const builder = new PropertyBuilder();
        await expect(builder.addBasePropertyInfo({}, "invalid-type", "host-1"))
            .rejects.toThrow(NotFoundException);
    });

    it("should throw error when amenity ID is invalid", async () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        await expect(builder.addAmenities([{amenityId: "fake-id"}]))
            .rejects.toThrow("Amenity not found.");
    });

    it("should throw error if availableStartDate is in the past", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        const yesterday = Date.now() - 86400000;
        const tomorrow = Date.now() + 86400000;

        expect(() => builder.addAvailability([{availableStartDate: yesterday, availableEndDate: tomorrow}]))
            .toThrow("Available start date can not be in the past.");
    });

    it("should throw error if availableStartDate is after availableEndDate", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        const start = Date.now() + 86400000 * 2;
        const end = Date.now() + 86400000;

        expect(() => builder.addAvailability([{availableStartDate: start, availableEndDate: end}]))
            .toThrow("Available end date can not be before available start date");
    });

    it("should throw error when availability restriction does not exist", async () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        await expect(builder.addAvailabilityRestrictions({restriction: "invalid", value: 1}))
            .rejects.toThrow("Restriction not found.");
    });

    it("should throw error for invalid check-in time slot", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        expect(() => builder.addCheckIn({
            checkIn: {from: 10, till: 5},
            checkOut: {from: 1, till: 2}
        })).toThrow("Check-in timeslot is incorrect.");
    });

    it("should throw error for invalid check-out time slot", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        expect(() => builder.addCheckIn({
            checkIn: {from: 1, till: 2},
            checkOut: {from: 5, till: 1}
        })).toThrow("Check-out timeslot is incorrect.");
    });

    it("should throw error if general detail is invalid", async () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        await expect(builder.addGeneralDetails([{detail: "invalid", value: 1}]))
            .rejects.toThrow("Detail not found.");
    });

    it("should throw error if required location field is missing", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        expect(() => builder.addLocation({
            country: "Netherlands",
            city: "Haarlem",
            houseNumber: 1,
            houseNumberExtension: "",
            postalCode: "1234 AB"
        })).toThrow("propertyLocation - Street must be a string.");
    });

    it("should throw error if rule does not exist", async () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        await expect(builder.addRules([{rule: "invalid", value: true}]))
            .rejects.toThrow("Rule not found.");
    });

    it("should throw TypeException if fewer than 5 images are provided", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        expect(() => builder.addImages([{key: "1", image: "img"}]))
            .toThrow(TypeException);
    });

    it("should throw TypeException if more than 30 images are provided", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        const images = new Array(31).fill({key: "img", image: "img"});

        expect(() => builder.addImages(images))
            .toThrow(TypeException);
    });

    it("should throw error if required technical detail is missing", () => {
        const builder = new PropertyBuilder();
        builder.property = {id: "test"};

        const invalidDetails = {
            property_id: "test",
            length: 500,
            fuelConsumption: 100,
            speed: 50,
            renovationYear: 2020,
            transmission: "Manual",
            generalPeriodicInspection: 2021,
            fourWheelDrive: true
        };

        expect(() => builder.addTechnicalDetails(invalidDetails))
            .toThrow("propertyTechnicalDetails - Height must be a number.");
    });
});
