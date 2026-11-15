import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const CHAINED_METHODS = [
  "innerJoin",
  "where",
  "andWhere",
  "setParameter",
  "addSelect",
  "orderBy",
  "addOrderBy",
  "limit",
];
const SUBQUERY_METHODS = ["select", "from", "where", "andWhere"];
const SUBQUERY_SQL = "(SELECT approved-at-subquery)";

describe("PropertyRepository.getActivePropertiesByType", () => {
  let repository;
  let chain;
  let subquery;

  const read = async (rows = [{ id: "p1" }]) => {
    subquery = Object.fromEntries(SUBQUERY_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    subquery.getQuery = jest.fn(() => SUBQUERY_SQL);
    chain = Object.fromEntries(CHAINED_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    chain.subQuery = jest.fn(() => subquery);
    chain.getMany = jest.fn().mockResolvedValue(rows);
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })),
    });
    return await repository.getActivePropertiesByType("Villa");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PropertyRepository({});
  });

  it("still returns only active properties of the requested type", async () => {
    await read();

    expect(chain.where).toHaveBeenCalledWith("pt.type = :type", { type: "Villa" });
    expect(chain.andWhere).toHaveBeenCalledWith("property.status = :status", { status: "ACTIVE" });
  });

  it("reads the latest approval of each property, and zero when it has none", async () => {
    await read();

    expect(subquery.select).toHaveBeenCalledWith("COALESCE(MAX(event.createdAt), 0)");
    expect(subquery.from).toHaveBeenCalledWith(Property_Moderation_Event, "event");
    expect(subquery.where).toHaveBeenCalledWith("event.propertyId = property.id");
    expect(subquery.andWhere).toHaveBeenCalledWith("event.action = :approved");
  });

  it("binds the approval action to APPROVED and nothing else", async () => {
    await read();

    expect(chain.setParameter).toHaveBeenCalledWith("approved", "APPROVED");
  });

  it("selects the approval time under the alias it sorts on", async () => {
    await read();

    expect(chain.addSelect).toHaveBeenCalledWith(SUBQUERY_SQL, "approved_at");
  });

  it("sorts oldest approval first, then newest listing first, then id descending", async () => {
    await read();

    expect(chain.orderBy).toHaveBeenCalledWith("approved_at", "ASC");
    expect(chain.addOrderBy.mock.calls).toEqual([
      ["property.createdat", "DESC"],
      ["property.id", "DESC"],
    ]);
  });

  it("keeps the limit of 12", async () => {
    await read();

    expect(chain.limit).toHaveBeenCalledWith(12);
  });

  it("returns the identifiers in the order read", async () => {
    await expect(read([{ id: "p2" }, { id: "p1" }])).resolves.toEqual(["p2", "p1"]);
  });

  it("throws not found when no property matches", async () => {
    await expect(read([])).rejects.toBeInstanceOf(NotFoundException);
  });
});
