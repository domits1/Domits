import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { applyListingCursor } from "../../functions/PropertyHandler/data/repository/listingPosition.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

// The cursor rules (what counts as a cursor, the id lookup, the 400) are tested on applyListingCursor itself, in
// listingPosition.test.js. Here it is replaced, and this suite checks that the feed hands it the right things.
jest.mock("../../functions/PropertyHandler/data/repository/listingPosition.js", () => ({
  ...jest.requireActual("../../functions/PropertyHandler/data/repository/listingPosition.js"),
  applyListingCursor: jest.fn(),
}));

const CHAINED_METHODS = ["select", "leftJoin", "where", "andWhere", "addSelect", "orderBy", "addOrderBy", "limit"];

describe("PropertyRepository.getActiveProperties", () => {
  let repository;
  let chain;
  let client;

  const buildChain = (rows) => {
    const builder = Object.fromEntries(CHAINED_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    builder.getMany = jest.fn().mockResolvedValue(rows);
    return builder;
  };

  const read = async (cursor, rows = [{ id: "p1", createdat: 10 }]) => {
    chain = buildChain(rows);
    client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) };
    Database.getInstance.mockResolvedValue(client);
    return await repository.getActiveProperties(cursor);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    applyListingCursor.mockImplementation(async (_client, query) => query);
    repository = new PropertyRepository({});
  });

  describe("the query", () => {
    it("reads only active properties, twelve at a time", async () => {
      await read(undefined);

      expect(chain.where).toHaveBeenCalledWith("property.status = :status", { status: "ACTIVE" });
      expect(chain.limit).toHaveBeenCalledWith(12);
    });

    it("selects only the columns the cursor and the identifiers need", async () => {
      await read(undefined);

      expect(chain.select).toHaveBeenCalledWith(["property.id", "property.createdat"]);
    });

    it("sorts by approval, then newest listing, then id descending", async () => {
      await read(undefined);

      expect(chain.leftJoin).toHaveBeenCalledWith(expect.any(Function), "approval", "approval.property_id = property.id");
      expect(chain.orderBy).toHaveBeenCalledWith("approved_at", "ASC");
      expect(chain.addOrderBy.mock.calls).toEqual([
        ["property.createdat", "DESC"],
        ["property.id", "DESC"],
      ]);
    });
  });

  describe("the cursor", () => {
    const cursor = { createdAt: 999, id: "property-6" };

    it("hands the client, the query and the cursor to applyListingCursor", async () => {
      await read(cursor);

      expect(applyListingCursor).toHaveBeenCalledTimes(1);
      expect(applyListingCursor).toHaveBeenCalledWith(client, chain, cursor);
    });

    it("passes the first page's missing cursor on as it is, and leaves the decision to applyListingCursor", async () => {
      await read(undefined);

      expect(applyListingCursor).toHaveBeenCalledWith(client, chain, undefined);
    });

    it("passes no scope, so the lookup is not limited to anything beyond the id", async () => {
      await read(cursor);

      expect(applyListingCursor.mock.calls[0]).toHaveLength(3);
    });

    it("runs the page query on the query that applyListingCursor returns", async () => {
      const continued = buildChain([{ id: "later", createdat: 5 }]);
      applyListingCursor.mockResolvedValue(continued);

      const result = await read(cursor);

      expect(continued.getMany).toHaveBeenCalledTimes(1);
      expect(chain.getMany).not.toHaveBeenCalled();
      expect(result.identifiers).toEqual(["later"]);
    });

    it("runs no page query when applyListingCursor refuses the cursor, and lets the refusal through", async () => {
      applyListingCursor.mockRejectedValue(Object.assign(new Error("Unknown pagination cursor."), { statusCode: 400 }));

      await expect(read(cursor)).rejects.toMatchObject({ statusCode: 400, message: "Unknown pagination cursor." });
      expect(chain.getMany).not.toHaveBeenCalled();
    });
  });

  describe("result", () => {
    it("returns the identifiers and a cursor at the last row, in the {createdAt, id} shape", async () => {
      const result = await read(undefined, [
        { id: "a", createdat: 30 },
        { id: "b", createdat: 20 },
      ]);

      expect(result).toEqual({ identifiers: ["a", "b"], lastEvaluatedKey: { createdAt: 20, id: "b" } });
    });

    it("throws not found when no property matches", async () => {
      await expect(read(undefined, [])).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
