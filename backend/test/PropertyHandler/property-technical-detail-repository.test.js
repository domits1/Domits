import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import Database from "database";
import { PropertyTechnicalDetailRepository } from "../../functions/PropertyHandler/data/repository/propertyTechnicalDetailRepository.js";
import { Property_Technical_Details } from "../../ORM/models/Property_Technical_Details.js";
import { getPropertyObject } from "./events/propertyObject.js";

jest.mock("database", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

describe("PropertyTechnicalDetailRepository", () => {
  const technicalDetailsRow = {
    property_id: "prop-1",
    length: 500,
    height: 200,
    fuelconsumption: 100,
    speed: 50,
    renovationyear: 2022,
    transmission: "Automatic",
    generalperiodicinspection: 2020,
    fourwheeldrive: true,
  };

  let insertBuilder;
  let selectBuilder;
  let client;

  beforeEach(() => {
    insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    selectBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(technicalDetailsRow),
    };

    client = {
      createQueryBuilder: jest.fn(() => insertBuilder),
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => selectBuilder),
      })),
    };

    Database.getInstance.mockResolvedValue(client);
  });

  it("reads technical details by property id and maps the database row", async () => {
    const repository = new PropertyTechnicalDetailRepository({});

    const result = await repository.getTechnicalDetailsByPropertyId("prop-1");

    expect(client.getRepository).toHaveBeenCalledWith(Property_Technical_Details);
    expect(selectBuilder.where).toHaveBeenCalledWith("property_id = :id", { id: "prop-1" });
    expect(result).toEqual({
      property_id: "prop-1",
      length: 500,
      height: 200,
      fuelConsumption: 100,
      speed: 50,
      renovationYear: 2022,
      transmission: "Automatic",
      generalPeriodicInspection: 2020,
      fourWheelDrive: true,
    });
  });

  it("creates technical details and returns the mapped stored record", async () => {
    const repository = new PropertyTechnicalDetailRepository({});
    const details = getPropertyObject().propertyTechnicalDetails;

    const result = await repository.create(details);

    expect(client.createQueryBuilder).toHaveBeenCalled();
    expect(insertBuilder.insert).toHaveBeenCalled();
    expect(insertBuilder.into).toHaveBeenCalledWith(Property_Technical_Details);
    expect(insertBuilder.values).toHaveBeenCalledWith({
      property_id: details.property_id,
      length: details.length,
      height: details.height,
      fuelconsumption: details.fuelConsumption,
      speed: details.speed,
      renovationyear: details.renovationYear,
      transmission: details.transmission,
      generalperiodicinspection: details.generalPeriodicInspection,
      fourwheeldrive: details.fourWheelDrive,
    });
    expect(selectBuilder.where).toHaveBeenCalledWith("property_id = :id", { id: details.property_id });
    expect(result).toEqual({
      property_id: "prop-1",
      length: 500,
      height: 200,
      fuelConsumption: 100,
      speed: 50,
      renovationYear: 2022,
      transmission: "Automatic",
      generalPeriodicInspection: 2020,
      fourWheelDrive: true,
    });
  });
});
