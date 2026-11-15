import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const buildHarness = (row) => {
  const operation = {};
  const chain = {
    select: (columns) => Object.assign(operation, { columns }) && chain,
    where: (condition, params) => Object.assign(operation, { condition, params }) && chain,
    orderBy: (column, direction) => Object.assign(operation, { orderColumn: column, direction }) && chain,
    limit: (limit) => Object.assign(operation, { limit }) && chain,
    getOne: async () => row,
  };
  const client = {
    createQueryBuilder: jest.fn((entity, alias) => Object.assign(operation, { entity, alias }) && chain),
  };
  Database.getInstance.mockResolvedValue(client);
  return operation;
};

describe("PropertyRepository.getLatestRejection", () => {
  let repository;

  beforeEach(() => {
    repository = new PropertyRepository({});
  });

  afterEach(() => {
    Database.getInstance.mockReset();
  });

  it("asks for the newest REJECTED event of the property, one row", async () => {
    const operation = buildHarness({ reason: "Photos are blurry", createdAt: 1_800_000_000_000 });

    await repository.getLatestRejection("property-1");

    expect(operation.entity).toBe(Property_Moderation_Event);
    expect(operation.condition).toContain("event.propertyId = :propertyId");
    expect(operation.condition).toContain("event.action = :action");
    expect(operation.params).toEqual({ propertyId: "property-1", action: "REJECTED" });
    expect(operation.orderColumn).toBe("event.createdAt");
    expect(operation.direction).toBe("DESC");
    expect(operation.limit).toBe(1);
  });

  it("selects only the reason and the time, never the actor", async () => {
    const operation = buildHarness({ reason: "Photos are blurry", createdAt: 1_800_000_000_000 });

    await repository.getLatestRejection("property-1");

    expect(operation.columns).toEqual(["event.reason", "event.createdAt"]);
  });

  it("returns the row it found", async () => {
    const row = { reason: "Photos are blurry", createdAt: 1_800_000_000_000 };
    buildHarness(row);

    await expect(repository.getLatestRejection("property-1")).resolves.toEqual(row);
  });

  it("returns null when the property has no rejection", async () => {
    buildHarness(null);

    await expect(repository.getLatestRejection("property-1")).resolves.toBeNull();
  });
});
