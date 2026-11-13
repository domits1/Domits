import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const KEYSET_CLAUSE = "(property.updatedat > :updatedAt OR (property.updatedat = :updatedAt AND property.id > :id))";

const buildRow = (id, updatedat) => ({ id, updatedat });

describe("PropertyRepository.getPropertiesByStatusOldestFirst", () => {
  let repository;
  let chain;
  let client;

  const mockRows = (rows) => {
    chain = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) };
    Database.getInstance.mockResolvedValue(client);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PropertyRepository({});
  });

  it("filters on the given status only", async () => {
    mockRows([]);

    await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 25 });

    expect(chain.where).toHaveBeenCalledWith("property.status = :status", { status: "PENDING_REVIEW" });
  });

  it("orders by updatedat ascending, then id ascending", async () => {
    mockRows([]);

    await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 25 });

    expect(chain.orderBy).toHaveBeenCalledWith("property.updatedat", "ASC");
    expect(chain.addOrderBy).toHaveBeenCalledWith("property.id", "ASC");
  });

  it("asks for one row more than the limit to detect a next page", async () => {
    mockRows([]);

    await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 25 });

    expect(chain.limit).toHaveBeenCalledWith(26);
  });

  it("adds no keyset condition on the first page", async () => {
    mockRows([]);

    await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 25 });

    expect(chain.andWhere).not.toHaveBeenCalled();
  });

  it("continues strictly after the cursor row on updatedat, then id", async () => {
    mockRows([]);

    await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", {
      after: { updatedAt: 1_800_000_000_000, id: "property-7" },
      limit: 25,
    });

    expect(chain.andWhere).toHaveBeenCalledTimes(1);
    expect(chain.andWhere).toHaveBeenCalledWith(KEYSET_CLAUSE, { updatedAt: 1_800_000_000_000, id: "property-7" });
  });

  it("returns an empty page without a next page or key when nothing matches", async () => {
    mockRows([]);

    const result = await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 25 });

    expect(result).toEqual({ identifiers: [], hasMore: false, lastKey: null });
  });

  it("returns every row and no next page when fewer than limit + 1 come back", async () => {
    mockRows([buildRow("a", 10), buildRow("b", 20)]);

    const result = await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 3 });

    expect(result).toEqual({ identifiers: ["a", "b"], hasMore: false, lastKey: { updatedAt: 20, id: "b" } });
  });

  it("returns exactly limit rows and no next page when limit rows come back", async () => {
    mockRows([buildRow("a", 10), buildRow("b", 20)]);

    const result = await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 2 });

    expect(result).toEqual({ identifiers: ["a", "b"], hasMore: false, lastKey: { updatedAt: 20, id: "b" } });
  });

  it("drops the extra row and keys the next page on the last kept row", async () => {
    mockRows([buildRow("a", 10), buildRow("b", 20), buildRow("c", 30)]);

    const result = await repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit: 2 });

    expect(result).toEqual({ identifiers: ["a", "b"], hasMore: true, lastKey: { updatedAt: 20, id: "b" } });
  });

  it.each([[0], [-1], [1.5], [Number.NaN], ["25"], [undefined]])(
    "rejects the limit %p before touching the database",
    async (limit) => {
      mockRows([]);

      await expect(repository.getPropertiesByStatusOldestFirst("PENDING_REVIEW", { limit })).rejects.toBeInstanceOf(
        TypeError
      );
      expect(Database.getInstance).not.toHaveBeenCalled();
    }
  );
});
