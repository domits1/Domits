import { beforeEach, describe, expect, it } from "@jest/globals";
// Imported first on purpose: it installs the Database and applyListingCursor mocks before the repository loads.
import * as feed from "./support/listingQueryTestHelpers.js";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";

describe("PropertyRepository.getActiveProperties", () => {
  let repository;
  const { state, run, resetMocks, buildChain } = feed.createFeedHarness();

  const read = (cursor, rows = [{ id: "p1", createdat: 10 }]) =>
    run(rows, () => repository.getActiveProperties(cursor));

  beforeEach(() => {
    resetMocks();
    repository = new PropertyRepository({});
  });

  describe("the query", () => {
    it("reads only active properties, twelve at a time", async () => {
      await read(undefined);

      expect(state.chain.where).toHaveBeenCalledWith("property.status = :status", { status: "ACTIVE" });
      expect(state.chain.limit).toHaveBeenCalledWith(12);
    });

    it("selects only the columns the cursor and the identifiers need", async () => {
      await read(undefined);

      expect(state.chain.select).toHaveBeenCalledWith(["property.id", "property.createdat"]);
    });

    it("sorts by approval, then newest listing, then id descending", async () => {
      await read(undefined);

      expect(state.chain.leftJoin).toHaveBeenCalledWith(
        expect.any(Function),
        "approval",
        "approval.property_id = property.id"
      );
      expect(state.chain.orderBy).toHaveBeenCalledWith("approved_at", "ASC");
      expect(state.chain.addOrderBy.mock.calls).toEqual([
        ["property.createdat", "DESC"],
        ["property.id", "DESC"],
      ]);
    });
  });

  describe("the cursor", () => {
    const cursor = { createdAt: 999, id: "property-6" };

    it("hands the client, the query and the cursor to applyListingCursor", async () => {
      await read(cursor);

      expect(feed.applyListingCursor).toHaveBeenCalledTimes(1);
      expect(feed.applyListingCursor).toHaveBeenCalledWith(state.client, state.chain, cursor);
    });

    it("passes the first page's missing cursor on as it is, and leaves the decision to applyListingCursor", async () => {
      await read(undefined);

      expect(feed.applyListingCursor).toHaveBeenCalledWith(state.client, state.chain, undefined);
    });

    it("passes no scope, so the lookup is not limited to anything beyond the id", async () => {
      await read(cursor);

      expect(feed.applyListingCursor.mock.calls[0]).toHaveLength(3);
    });

    feed.describeCursorContract({ read, state, buildChain });
  });

  feed.describeFeedResult(read);
});
