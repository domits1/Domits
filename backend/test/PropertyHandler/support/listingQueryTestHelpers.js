import { describe, expect, it, jest } from "@jest/globals";
import Database from "../../../ORM/index.js";
import { applyListingCursor } from "../../../functions/PropertyHandler/data/repository/listingPosition.js";
import { NotFoundException } from "../../../functions/PropertyHandler/util/exception/NotFoundException.js";

// jest.mock is hoisted only within the file it is written in. These two calls run when this module is first
// required, so a suite must import this module BEFORE the repository it tests; otherwise the repository would
// load the real database and the real cursor rules. Import order is the contract here.
jest.mock("../../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

// The cursor rules (what counts as a cursor, the id lookup, the 400) are tested on applyListingCursor itself, in
// listingPosition.test.js. A feed suite replaces it and checks only what its feed hands it.
jest.mock("../../../functions/PropertyHandler/data/repository/listingPosition.js", () => ({
  ...jest.requireActual("../../../functions/PropertyHandler/data/repository/listingPosition.js"),
  applyListingCursor: jest.fn(),
}));

export { Database, applyListingCursor };

const BASE_CHAINED_METHODS = ["select", "leftJoin", "where", "andWhere", "addSelect", "orderBy", "addOrderBy", "limit"];

/**
 * Builds the fake query builder both guest feeds are tested against: every chained method returns the builder, and
 * getMany resolves to the rows. A feed that uses a method the base list lacks (innerJoin, for byCountry) passes it
 * in as an extra.
 */
export const createChainBuilder = (extraMethods = []) => {
  const methods = [...BASE_CHAINED_METHODS, ...extraMethods];
  return (rows) => {
    const builder = Object.fromEntries(methods.map((method) => [method, jest.fn().mockReturnThis()]));
    builder.getMany = jest.fn().mockResolvedValue(rows);
    return builder;
  };
};

/**
 * The per-test setup both feed suites share. `run(rows, callFeed)` installs a fresh fake query builder and client,
 * then calls the suite's own feed; `state.chain` and `state.client` always hold those of the latest run, so a test
 * can assert on what the feed did to them. `resetMocks` belongs in the suite's beforeEach.
 *
 *   const { state, run, resetMocks } = createFeedHarness(buildChain);
 *   const read = (cursor, rows, country) => run(rows, () => repository.getActivePropertiesByCountry(country, cursor));
 */
export const createFeedHarness = (buildChain) => {
  const state = { chain: undefined, client: undefined };

  const run = async (rows, callFeed) => {
    state.chain = buildChain(rows);
    state.client = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => state.chain) })) };
    Database.getInstance.mockResolvedValue(state.client);
    return await callFeed();
  };

  const resetMocks = () => {
    jest.clearAllMocks();
    applyListingCursor.mockImplementation(async (_client, query) => query);
  };

  return { state, run, resetMocks };
};

/**
 * What every feed does with applyListingCursor's answer, whatever it hands it first: it runs the page query on the
 * query that comes back, and when applyListingCursor refuses the cursor it runs no page query and lets the refusal
 * through. `read(cursor)` is the suite's own reader; `buildChain` and `state` are the ones from its harness.
 */
export const describeCursorContract = ({ read, state, buildChain }) => {
  const cursor = { createdAt: 999, id: "property-6" };

  it("runs the page query on the query that applyListingCursor returns", async () => {
    const continued = buildChain([{ id: "later", createdat: 5 }]);
    applyListingCursor.mockResolvedValue(continued);

    const result = await read(cursor);

    expect(continued.getMany).toHaveBeenCalledTimes(1);
    expect(state.chain.getMany).not.toHaveBeenCalled();
    expect(result.identifiers).toEqual(["later"]);
  });

  it("runs no page query when applyListingCursor refuses the cursor, and lets the refusal through", async () => {
    applyListingCursor.mockRejectedValue(Object.assign(new Error("Unknown pagination cursor."), { statusCode: 400 }));

    await expect(read(cursor)).rejects.toMatchObject({ statusCode: 400, message: "Unknown pagination cursor." });
    expect(state.chain.getMany).not.toHaveBeenCalled();
  });
};

/**
 * The "result" tests: what any feed returns once its query has run. `read(cursor, rows)` is the suite's own reader.
 */
export const describeFeedResult = (read) => {
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
};
