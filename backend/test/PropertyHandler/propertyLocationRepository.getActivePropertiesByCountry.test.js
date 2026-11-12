import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyLocationRepository } from "../../functions/PropertyHandler/data/repository/propertyLocationRepository.js";
import { findListingPosition } from "../../functions/PropertyHandler/data/repository/listingPosition.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock("../../functions/PropertyHandler/data/repository/listingPosition.js", () => ({
  ...jest.requireActual("../../functions/PropertyHandler/data/repository/listingPosition.js"),
  findListingPosition: jest.fn(),
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
const CURSOR_POSITION = { approvedAt: 5000, createdAt: 777, id: "property-6" };

describe("PropertyLocationRepository.getActivePropertiesByCountry", () => {
  let repository;
  let chain;
  let client;

  const read = async (cursor, rows = [{ id: "p1", createdat: 10 }], country = "Netherlands") => {
    chain = Object.fromEntries(CHAINED_METHODS.map((method) => [method, jest.fn().mockReturnThis()]));
    chain.getMany = jest.fn().mockResolvedValue(rows);
    client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => chain) })) };
    Database.getInstance.mockResolvedValue(client);
    return await repository.getActivePropertiesByCountry(country, cursor);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findListingPosition.mockResolvedValue(CURSOR_POSITION);
    repository = new PropertyLocationRepository({});
  });

  describe("first page", () => {
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

    it("does not look up a cursor or filter by position", async () => {
      await read(undefined);

      expect(findListingPosition).not.toHaveBeenCalled();
      expect(chain.andWhere).not.toHaveBeenCalledWith(expect.stringContaining(":cursorApprovedAt"), expect.anything());
    });

    it.each([
      ["a controller cursor with NaN and no id", { createdAt: Number.NaN, id: undefined }],
      ["a cursor with NaN createdAt", { createdAt: Number.NaN, id: "property-6" }],
      ["a cursor with no id", { createdAt: 777, id: undefined }],
      ["a cursor whose createdAt is zero", { createdAt: 0, id: "property-6" }],
    ])("treats %s as no cursor", async (_name, cursor) => {
      await read(cursor);

      expect(findListingPosition).not.toHaveBeenCalled();
    });
  });

  describe("later pages", () => {
    const cursor = { createdAt: 999, id: "property-6" };

    it("looks the cursor row up by id", async () => {
      await read(cursor);

      expect(findListingPosition).toHaveBeenCalledWith(client, "property-6", expect.any(Function));
    });

    // A cursor taken from another country would otherwise be accepted and return a silently wrong page.
    describe("the country scope on the cursor lookup", () => {
      const lookupScopeFor = async (country) => {
        await read(cursor, undefined, country);
        return findListingPosition.mock.calls[0][2];
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

      it("refuses a cursor row outside the country, the same way as an unknown id", async () => {
        // findListingPosition returns null for a row the scope filters out, exactly as for a row that does not exist.
        findListingPosition.mockResolvedValue(null);

        await expect(read(cursor, undefined, "Germany")).rejects.toMatchObject({
          statusCode: 400,
          message: "Unknown pagination cursor.",
        });
        expect(chain.getMany).not.toHaveBeenCalled();
      });
    });

    it("continues after the position the database holds, not the createdAt the client sent", async () => {
      await read(cursor);

      expect(chain.andWhere).toHaveBeenCalledWith(expect.stringContaining(":cursorApprovedAt"), {
        cursorApprovedAt: 5000,
        cursorCreatedAt: 777,
        cursorId: "property-6",
      });
    });

    it("keeps the country filter on a later page", async () => {
      await read(cursor, undefined, "Germany");

      expect(chain.where).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
    });

    it("rejects an unknown cursor id with a 400 and runs no page query", async () => {
      findListingPosition.mockResolvedValue(null);

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
