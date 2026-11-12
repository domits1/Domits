import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const CHAINED_METHODS = ["select", "where", "orderBy", "addOrderBy", "limit"];
const EVENT_COLUMNS = ["id", "action", "fromStatus", "toStatus", "reason", "actorId", "createdAt"];
const conflict = () => Object.assign(new Error("change conflicts with another transaction"), { code: "40001" });

describe("PropertyRepository.getModerationEventsByPropertyId", () => {
  let repository;
  let chain;
  let client;

  const prepare = (rows = []) => {
    chain = Object.fromEntries(CHAINED_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    chain.getMany = jest.fn().mockResolvedValue(rows);
    client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) };
    Database.getInstance.mockResolvedValue(client);
  };

  const read = async (rows) => {
    prepare(rows);
    return await repository.getModerationEventsByPropertyId("property-1");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PropertyRepository({});
  });

  it("reads the moderation event table", async () => {
    await read();

    expect(client.getRepository).toHaveBeenCalledWith(Property_Moderation_Event);
  });

  it("filters on the given property only", async () => {
    await read();

    expect(chain.where).toHaveBeenCalledWith("event.propertyId = :propertyId", { propertyId: "property-1" });
  });

  it("orders by createdAt descending, then id descending", async () => {
    await read();

    expect(chain.orderBy).toHaveBeenCalledWith("event.createdAt", "DESC");
    expect(chain.addOrderBy).toHaveBeenCalledWith("event.id", "DESC");
  });

  it("limits to 50 rows", async () => {
    await read();

    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it("selects exactly the columns the admin history shows", async () => {
    await read();

    expect(chain.select).toHaveBeenCalledWith(EVENT_COLUMNS.map((column) => `event.${column}`));
  });

  it("returns the rows as read", async () => {
    const rows = [
      { id: "e2", action: "REJECTED", fromStatus: "PENDING_REVIEW", toStatus: "DRAFT", reason: "Blurry", actorId: "admin-1", createdAt: 20 },
      { id: "e1", action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_REVIEW", reason: null, actorId: "host-1", createdAt: 10 },
    ];

    await expect(read(rows)).resolves.toEqual(rows);
  });

  it("returns an empty array when the property has no events", async () => {
    await expect(read([])).resolves.toEqual([]);
  });

  it("retries a write conflict instead of failing", async () => {
    prepare();
    chain.getMany.mockRejectedValueOnce(conflict()).mockResolvedValueOnce([{ id: "e1" }]);

    await expect(repository.getModerationEventsByPropertyId("property-1")).resolves.toEqual([{ id: "e1" }]);
    expect(chain.getMany).toHaveBeenCalledTimes(2);
  });
});
