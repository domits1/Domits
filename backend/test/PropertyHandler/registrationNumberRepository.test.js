import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const buildUpdateChain = (execute) => {
  const chain = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute,
  };
  return chain;
};

const buildSelectChain = ({ count = 0, row = null } = {}) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(count),
  getOne: jest.fn().mockResolvedValue(row),
});

const uniqueViolation = (shape) => {
  const error = new Error("duplicate key value violates unique constraint");
  return shape === "driverError" ? Object.assign(error, { driverError: { code: "23505" } }) : Object.assign(error, { code: "23505" });
};

describe("PropertyRepository registration number", () => {
  let repository;
  let updateChain;
  let selectChain;

  const mockDatabase = (execute) => {
    updateChain = buildUpdateChain(execute);
    selectChain = buildSelectChain({
      row: {
        id: "property-1",
        hostid: "host-1",
        title: "Canal house",
        subtitle: "Central",
        description: "A house on the canal",
        registrationnumber: "NL-1234",
        status: "INACTIVE",
        createdat: 1,
        updatedat: 2,
        bookingtype: "direct",
      },
    });
    Database.getInstance.mockResolvedValue({
      createQueryBuilder: jest.fn(() => updateChain),
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectChain) })),
    });
  };

  beforeEach(() => {
    repository = new PropertyRepository({});
  });

  describe("updateRegistrationNumber", () => {
    it("updates only registrationnumber and updatedat for the given property", async () => {
      mockDatabase(jest.fn().mockResolvedValue(undefined));

      const updated = await repository.updateRegistrationNumber("property-1", "NL-1234");

      expect(updateChain.set).toHaveBeenCalledTimes(1);
      const updatedFields = updateChain.set.mock.calls[0][0];
      expect(Object.keys(updatedFields).sort()).toEqual(["registrationnumber", "updatedat"]);
      expect(updatedFields.registrationnumber).toBe("NL-1234");
      expect(updateChain.where).toHaveBeenCalledWith("id = :id", { id: "property-1" });
      expect(updated.registrationNumber).toBe("NL-1234");
    });

    it.each([
      ["error.code", "code"],
      ["error.driverError.code", "driverError"],
    ])("backstop: maps a 23505 on %s to a 409 ConflictException", async (_label, shape) => {
      mockDatabase(jest.fn().mockRejectedValue(uniqueViolation(shape)));

      const failure = repository.updateRegistrationNumber("property-1", "NL-1234");

      await expect(failure).rejects.toBeInstanceOf(ConflictException);
      await expect(failure).rejects.toMatchObject({
        statusCode: 409,
        message: "This registration number is already used by another listing.",
      });
    });

    it("rethrows non-unique-violation errors unchanged", async () => {
      const connectionError = Object.assign(new Error("connection lost"), { code: "08006" });
      mockDatabase(jest.fn().mockRejectedValue(connectionError));

      await expect(repository.updateRegistrationNumber("property-1", "NL-1234")).rejects.toBe(connectionError);
    });
  });

  describe("isRegistrationNumberUsedByAnotherProperty", () => {
    it("queries for the same number on a different property id", async () => {
      mockDatabase(jest.fn());
      selectChain.getCount.mockResolvedValue(1);

      const isUsed = await repository.isRegistrationNumberUsedByAnotherProperty("NL-1234", "property-1");

      expect(isUsed).toBe(true);
      expect(selectChain.where).toHaveBeenCalledWith("property.registrationnumber = :registrationNumber", {
        registrationNumber: "NL-1234",
      });
      expect(selectChain.andWhere).toHaveBeenCalledWith("property.id != :propertyId", { propertyId: "property-1" });
    });

    it("returns false when no other property has the number", async () => {
      mockDatabase(jest.fn());
      selectChain.getCount.mockResolvedValue(0);

      await expect(repository.isRegistrationNumberUsedByAnotherProperty("NL-1234", "property-1")).resolves.toBe(false);
    });
  });
});
