import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { PropertyDeletionRepository } from "../../functions/PropertyHandler/data/repository/propertyDeletionRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const buildClient = ({ failOn = null } = {}) => {
  const statements = [];
  const transactionManager = {
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      if (failOn && statement.includes(failOn)) throw new Error(`failed on ${failOn}`);
      return [];
    }),
  };
  const client = {
    statements,
    committed: 0,
    transaction: jest.fn(async (runInTransaction) => {
      const result = await runInTransaction(transactionManager);
      client.committed += 1;
      return result;
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const deletes = (client) =>
  client.statements.map(({ statement }) => statement).filter((statement) => statement.startsWith("DELETE FROM"));

describe("deleting a property removes its destination mapping in the same transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(PropertyDeletionRepository.prototype, "tableExists").mockResolvedValue(true);
    jest
      .spyOn(PropertyDeletionRepository.prototype, "findExistingColumn")
      .mockImplementation(async (_, __, candidates) => candidates[0]);
    jest.spyOn(PropertyDeletionRepository.prototype, "valueExistsInTableColumn").mockResolvedValue(true);
    jest.spyOn(PropertyDeletionRepository.prototype, "getScopedIds").mockResolvedValue([]);
  });

  it("deletes the mapping row of a mapped property before the property row, in the one committed transaction", async () => {
    const client = buildClient();

    await new PropertyDeletionRepository().deletePropertyById("property-1");

    const mapping = deletes(client).findIndex((statement) => /property_destination/.test(statement));
    const property = deletes(client).findIndex((statement) => /"property"\s+WHERE/.test(statement));
    expect(mapping).toBeGreaterThan(-1);
    expect(property).toBeGreaterThan(mapping);
    expect(client.statements.find(({ statement }) => /property_destination/.test(statement)).parameters).toEqual([
      "property-1",
    ]);
    expect(client.committed).toBe(1);
  });

  it("rejects when the mapping delete fails, so nothing is committed and the property row delete never runs", async () => {
    const client = buildClient({ failOn: "property_destination" });

    await expect(new PropertyDeletionRepository().deletePropertyById("property-1")).rejects.toThrow(
      "failed on property_destination"
    );

    expect(deletes(client).some((statement) => /"property"\s+WHERE/.test(statement))).toBe(false);
    expect(client.committed).toBe(0);
  });
});
