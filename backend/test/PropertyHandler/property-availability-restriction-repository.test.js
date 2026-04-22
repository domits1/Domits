import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import Database from "database";
import { PropertyAvailabilityRestrictionRepository } from "../../functions/PropertyHandler/data/repository/propertyAvailabilityRestrictionRepository.js";
import { Property_Availability_Restriction } from "../../ORM/models/Property_Availability_Restriction.js";
import { Availability_Restrictions } from "../../ORM/models/Availability_Restrictions.js";
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

describe("PropertyAvailabilityRestrictionRepository", () => {
  const propertyId = "prop-1";
  const restrictionRow = {
    id: "restriction-1",
    property_id: propertyId,
    restriction: "MaximumNightsPerYear",
    value: 30,
  };

  let createInsertBuilder;
  let propertyByIdBuilder;
  let propertyByPropertyIdBuilder;
  let lookupBuilder;
  let deleteBuilder;
  let replaceInsertBuilder;
  let updatedRestrictionsBuilder;
  let getRepositoryMock;
  let propertyRestrictionBuilderQueue;
  let client;
  let transactionManager;

  beforeEach(() => {
    randomUuidMock.mockReset();
    randomUuidMock
      .mockReturnValueOnce("generated-restriction-1")
      .mockReturnValueOnce("generated-restriction-2")
      .mockReturnValue("generated-restriction-3");

    createInsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    propertyByIdBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(restrictionRow),
    };

    propertyByPropertyIdBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([restrictionRow]),
    };

    lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    deleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    replaceInsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    updatedRestrictionsBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([restrictionRow]),
    };

    propertyRestrictionBuilderQueue = [];

    transactionManager = {
      getRepository: jest.fn((entity) => {
        const tableName = entity?.options?.tableName;

        if (tableName === "availability_restrictions") {
          return {
            createQueryBuilder: jest.fn(() => lookupBuilder),
          };
        }

        if (tableName === "property_availabilityrestriction") {
          return {
            createQueryBuilder: jest
              .fn()
              .mockReturnValueOnce(updatedRestrictionsBuilder),
          };
        }

        return {
          createQueryBuilder: jest.fn(),
        };
      }),
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(deleteBuilder)
        .mockReturnValueOnce(replaceInsertBuilder),
    };

    getRepositoryMock = jest.fn((entity) => {
      const tableName = entity?.options?.tableName;

      if (tableName === "property_availabilityrestriction") {
        return {
          createQueryBuilder: jest.fn(() => propertyRestrictionBuilderQueue.shift()),
        };
      }

      return {
        createQueryBuilder: jest.fn(),
      };
    });

    client = {
      createQueryBuilder: jest.fn(() => createInsertBuilder),
      getRepository: getRepositoryMock,
      transaction: jest.fn(async (callback) => callback(transactionManager)),
    };

    Database.getInstance.mockResolvedValue(client);
  });

  it("creates an availability restriction and returns the stored mapped result", async () => {
    const repository = new PropertyAvailabilityRestrictionRepository({});
    const restriction = getPropertyObject().propertyAvailabilityRestrictions[0];
    propertyRestrictionBuilderQueue.push(propertyByIdBuilder);

    const result = await repository.create(restriction);

    expect(createInsertBuilder.insert).toHaveBeenCalled();
    expect(createInsertBuilder.into).toHaveBeenCalledWith(Property_Availability_Restriction);
    expect(createInsertBuilder.values).toHaveBeenCalledWith({
      id: restriction.id,
      property_id: restriction.property_id,
      restriction: restriction.restriction,
      value: restriction.value,
    });
    expect(propertyByIdBuilder.where).toHaveBeenCalledWith("id = :id", { id: restriction.id });
    expect(result).toEqual(restrictionRow);
  });

  it("reads availability restrictions by property id and maps the results", async () => {
    const repository = new PropertyAvailabilityRestrictionRepository({});
    propertyRestrictionBuilderQueue.push(propertyByPropertyIdBuilder);

    const result = await repository.getAvailabilityRestrictionsByPropertyId(propertyId);

    expect(getRepositoryMock).toHaveBeenCalledWith(Property_Availability_Restriction);
    expect(propertyByPropertyIdBuilder.where).toHaveBeenCalledWith("property_id = :id", { id: propertyId });
    expect(result).toEqual([restrictionRow]);
  });

  it("normalizes, deduplicates, deletes, and reinserts updated restrictions", async () => {
    lookupBuilder.getMany.mockResolvedValueOnce([
      { restriction: "MaximumStay" },
      { restriction: "MaximumNightsPerYear" },
    ]);

    const repository = new PropertyAvailabilityRestrictionRepository({});

    const result = await repository.replaceRestrictionsByPropertyId(propertyId, [
      { restriction: "MaximumStay", value: 2.8 },
      { restriction: "MaximumStay", value: 4.4 },
      { restriction: "MaximumNightsPerYear", value: -3 },
    ]);

    expect(client.transaction).toHaveBeenCalled();
    expect(transactionManager.getRepository).toHaveBeenCalledWith(Availability_Restrictions);
    expect(lookupBuilder.select).toHaveBeenCalledWith(["availability_restrictions.restriction"]);
    expect(lookupBuilder.where).toHaveBeenCalledWith(
      "availability_restrictions.restriction IN (:...restrictionNames)",
      { restrictionNames: ["MaximumStay", "MaximumNightsPerYear"] }
    );
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.from).toHaveBeenCalledWith(Property_Availability_Restriction);
    expect(deleteBuilder.where).toHaveBeenCalledWith("property_id = :propertyId", { propertyId });
    expect(deleteBuilder.andWhere).toHaveBeenCalledWith("restriction IN (:...restrictionNames)", {
      restrictionNames: ["MaximumStay", "MaximumNightsPerYear"],
    });
    expect(replaceInsertBuilder.insert).toHaveBeenCalled();
    expect(replaceInsertBuilder.into).toHaveBeenCalledWith(Property_Availability_Restriction);
    expect(replaceInsertBuilder.values).toHaveBeenCalledWith([
      {
        id: "generated-restriction-1",
        property_id: propertyId,
        restriction: "MaximumStay",
        value: 4,
      },
      {
        id: "generated-restriction-2",
        property_id: propertyId,
        restriction: "MaximumNightsPerYear",
        value: 0,
      },
    ]);
    expect(updatedRestrictionsBuilder.where).toHaveBeenCalledWith("property_id = :id", { id: propertyId });
    expect(result).toEqual([restrictionRow]);
  });

  it("remaps restriction names through the current fallback logic during replace", async () => {
    lookupBuilder.getMany.mockResolvedValueOnce([
      { restriction: "MinimumAdvanceNoticeDays" },
    ]);

    const repository = new PropertyAvailabilityRestrictionRepository({});

    await repository.replaceRestrictionsByPropertyId(propertyId, [
      { restriction: "MinimumAdvanceReservation", value: 5 },
    ]);

    expect(lookupBuilder.where).toHaveBeenCalledWith(
      "availability_restrictions.restriction IN (:...restrictionNames)",
      {
        restrictionNames: [
          "MinimumAdvanceReservation",
          "MinimumAdvanceNoticeDays",
          "MinimumAdvanceBookingDays",
        ],
      }
    );
    expect(deleteBuilder.andWhere).toHaveBeenCalledWith("restriction IN (:...restrictionNames)", {
      restrictionNames: ["MinimumAdvanceNoticeDays"],
    });
    expect(replaceInsertBuilder.values).toHaveBeenCalledWith([
      {
        id: "generated-restriction-1",
        property_id: propertyId,
        restriction: "MinimumAdvanceNoticeDays",
        value: 5,
      },
    ]);
  });

  it("throws for unknown restriction names after fallback lookup fails", async () => {
    lookupBuilder.getMany.mockResolvedValueOnce([]);

    const repository = new PropertyAvailabilityRestrictionRepository({});

    await expect(
      repository.replaceRestrictionsByPropertyId(propertyId, [
        { restriction: "UnknownRestriction", value: 1 },
      ])
    ).rejects.toThrow("Unknown availability restrictions: UnknownRestriction");

    expect(deleteBuilder.delete).not.toHaveBeenCalled();
    expect(replaceInsertBuilder.insert).not.toHaveBeenCalled();
  });
});
