import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyLocationRepository } from "../../functions/PropertyHandler/data/repository/propertyLocationRepository.js";
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
// listingPosition.test.js. Here it is replaced, and this suite checks what this feed hands it: above all the country
// scope, because a cursor from another country must not be accepted.
jest.mock("../../functions/PropertyHandler/data/repository/listingPosition.js", () => ({
  ...jest.requireActual("../../functions/PropertyHandler/data/repository/listingPosition.js"),
  applyListingCursor: jest.fn(),
}));

const CHAINED_METHODS = [
  "select",
  "innerJoin",
  "leftJoin",
  "where",
  "andWhere",
  "addSelect",
  "orderBy",
  "addOrderBy",
  "limit",
];

describe("PropertyLocationRepository.getActivePropertiesByCountry", () => {
  let repository;
  let chain;
  let client;

  const buildChain = (rows) => {
    const builder = Object.fromEntries(CHAINED_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    builder.getMany = jest.fn().mockResolvedValue(rows);
    return builder;
  };

  const read = async (cursor, rows = [{ id: "p1", createdat: 10 }], country = "Netherlands") => {
    chain = buildChain(rows);
    client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) };
    Database.getInstance.mockResolvedValue(client);
    return await repository.getActivePropertiesByCountry(country, cursor);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    applyListingCursor.mockImplementation(async (_client, query) => query);
    repository = new PropertyLocationRepository({});
  });

  describe("the query", () => {
    it("reads only the properties of the requested country, bound as a parameter", async () => {
      await read(undefined, undefined, "Germany");

      expect(chain.where).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
    });

    it("joins the location table to the property on its id, so a property without a location is left out", async () => {
      await read(undefined);

      expect(chain.innerJoin).toHaveBeenCalledWith("property_location", "pl", "pl.property_id = property.id");
      expect(chain.leftJoin).not.toHaveBeenCalledWith("property_location", expect.anything(), expect.anything());
    });

    it("reads only active properties, twelve at a time", async () => {
      await read(undefined);

      expect(chain.andWhere).toHaveBeenCalledWith("property.status = :status", { status: "ACTIVE" });
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

    it("hands the client, the query, the cursor and a scope to applyListingCursor", async () => {
      await read(cursor);

      expect(applyListingCursor).toHaveBeenCalledTimes(1);
      expect(applyListingCursor).toHaveBeenCalledWith(client, chain, cursor, expect.any(Function));
    });

    it("keeps the country filter on a later page", async () => {
      await read(cursor, undefined, "Germany");

      expect(chain.where).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
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

    // A cursor taken from another country would otherwise be accepted and return a silently wrong page.
    describe("the country scope on the cursor lookup", () => {
      const lookupScopeFor = async (country) => {
        await read(cursor, undefined, country);
        return applyListingCursor.mock.calls[0][3];
      };
      const fakeLookup = () => {
        const lookup = { innerJoin: jest.fn(), andWhere: jest.fn() };
        lookup.innerJoin.mockReturnValue(lookup);
        lookup.andWhere.mockReturnValue(lookup);
        return lookup;
      };

      it("joins the location and keeps only the requested country", async () => {
        const lookup = fakeLookup();

        const scoped = (await lookupScopeFor("Germany"))(lookup);

        expect(lookup.innerJoin).toHaveBeenCalledWith("property_location", "pl", "pl.property_id = property.id");
        expect(lookup.andWhere).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
        expect(scoped).toBe(lookup);
      });

      it("uses the country of this request, not a fixed one", async () => {
        const lookup = fakeLookup();

        (await lookupScopeFor("France"))(lookup);

        expect(lookup.andWhere).toHaveBeenCalledWith("pl.country = :country", { country: "France" });
      });
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
