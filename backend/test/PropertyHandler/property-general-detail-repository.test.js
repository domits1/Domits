import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import Database from "database";
import { PropertyGeneralDetailRepository } from "../../functions/PropertyHandler/data/repository/propertyGeneralDetailRepository.js";
import { Property_General_Detail } from "../../ORM/models/Property_General_Detail.js";
import { getPropertyObject } from "./events/propertyObject.js";

const randomUuidMock = jest.fn();

jest.mock("database", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock("node:crypto", () => ({
  randomUUID: (...args) => randomUuidMock(...args),
}));

describe("PropertyGeneralDetailRepository", () => {
  const propertyId = "prop-1";
  const detailRow = {
    id: "detail-1",
    property_id: propertyId,
    detail: "Bedrooms",
    value: 2,
  };

  let insertBuilder;
  let updateBuilder;
  let existingLookupBuilder;
  let propertyByIdBuilder;
  let propertyByPropertyIdBuilder;
  let getRepositoryMock;
  let propertyGeneralDetailBuilderQueue;
  let mutationBuilderQueue;
  let client;

  beforeEach(() => {
    randomUuidMock.mockReset();
    randomUuidMock.mockReturnValue("generated-detail-id");

    insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    propertyByIdBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(detailRow),
    };

    propertyByPropertyIdBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([detailRow]),
    };

    existingLookupBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    propertyGeneralDetailBuilderQueue = [];
    mutationBuilderQueue = [];

    getRepositoryMock = jest.fn((entity) => {
      const tableName = entity?.options?.tableName;

      if (tableName === "property_generaldetail") {
        return {
          createQueryBuilder: jest.fn(() => propertyGeneralDetailBuilderQueue.shift()),
        };
      }

      return {
        createQueryBuilder: jest.fn(),
      };
    });

    client = {
      createQueryBuilder: jest.fn(() => mutationBuilderQueue.shift()),
      getRepository: getRepositoryMock,
    };

    Database.getInstance.mockResolvedValue(client);
  });

  it("creates a general detail and returns the stored mapped result", async () => {
    const repository = new PropertyGeneralDetailRepository({});
    const detail = getPropertyObject().propertyGeneralDetails[0];
    mutationBuilderQueue.push(insertBuilder);
    propertyGeneralDetailBuilderQueue.push(propertyByIdBuilder);

    const result = await repository.create(detail);

    expect(client.createQueryBuilder).toHaveBeenCalled();
    expect(insertBuilder.insert).toHaveBeenCalled();
    expect(insertBuilder.into).toHaveBeenCalledWith(Property_General_Detail);
    expect(insertBuilder.values).toHaveBeenCalledWith({
      id: detail.id,
      property_id: detail.property_id,
      detail: detail.detail,
      value: detail.value,
    });
    expect(propertyByIdBuilder.where).toHaveBeenCalledWith("id = :id", { id: detail.id });
    expect(result).toEqual(detailRow);
  });

  it("reads general details by property id and maps the results", async () => {
    const repository = new PropertyGeneralDetailRepository({});
    propertyGeneralDetailBuilderQueue.push(propertyByPropertyIdBuilder);

    const result = await repository.getPropertyGeneralDetailsByPropertyId(propertyId);

    expect(getRepositoryMock).toHaveBeenCalledWith(Property_General_Detail);
    expect(propertyByPropertyIdBuilder.where).toHaveBeenCalledWith("property_id = :id", { id: propertyId });
    expect(result).toEqual([detailRow]);
  });

  it("updates existing detail rows during upsert and normalizes values", async () => {
    existingLookupBuilder.getOne.mockResolvedValueOnce({
      id: "existing-id",
      property_id: propertyId,
      detail: "Guests",
      value: 1,
    });

    const repository = new PropertyGeneralDetailRepository({});
    mutationBuilderQueue.push(updateBuilder);
    propertyGeneralDetailBuilderQueue.push(existingLookupBuilder, propertyByPropertyIdBuilder);

    const result = await repository.upsertPropertyGeneralDetailsByPropertyId(propertyId, [
      { detail: "Guests", value: 3.9 },
    ]);

    expect(existingLookupBuilder.where).toHaveBeenCalledWith("property_id = :propertyId", { propertyId });
    expect(existingLookupBuilder.andWhere).toHaveBeenCalledWith("detail = :detail", { detail: "Guests" });
    expect(updateBuilder.update).toHaveBeenCalledWith(Property_General_Detail);
    expect(updateBuilder.set).toHaveBeenCalledWith({ value: 3 });
    expect(updateBuilder.where).toHaveBeenCalledWith("id = :id", { id: "existing-id" });
    expect(result).toEqual([detailRow]);
  });

  it("inserts missing detail rows during upsert and truncates negative values to zero", async () => {
    const repository = new PropertyGeneralDetailRepository({});
    mutationBuilderQueue.push(insertBuilder);
    propertyGeneralDetailBuilderQueue.push(existingLookupBuilder, propertyByPropertyIdBuilder);

    const result = await repository.upsertPropertyGeneralDetailsByPropertyId(propertyId, [
      { detail: "Bathrooms", value: -2.4 },
    ]);

    expect(randomUuidMock).toHaveBeenCalled();
    expect(insertBuilder.insert).toHaveBeenCalled();
    expect(insertBuilder.into).toHaveBeenCalledWith(Property_General_Detail);
    expect(insertBuilder.values).toHaveBeenCalledWith({
      id: "generated-detail-id",
      property_id: propertyId,
      detail: "Bathrooms",
      value: 0,
    });
    expect(result).toEqual([detailRow]);
  });
});
