import { beforeEach, describe, expect, it, jest } from "@jest/globals";
// Imported first on purpose: it installs the Database and applyListingCursor mocks before the repository loads.
import * as feed from "./support/listingQueryTestHelpers.js";
import { PropertyLocationRepository } from "../../functions/PropertyHandler/data/repository/propertyLocationRepository.js";

describe("PropertyLocationRepository.getActivePropertiesByCountry", () => {
  let repository;
  const { state, run, resetMocks, buildChain } = feed.createFeedHarness(["innerJoin"]);

  const read = (cursor, rows = [{ id: "p1", createdat: 10 }], country = "Netherlands") =>
    run(rows, () => repository.getActivePropertiesByCountry(country, cursor));

  beforeEach(() => {
    resetMocks();
    repository = new PropertyLocationRepository({});
  });

  describe("the query", () => {
    it("reads only the properties of the requested country, bound as a parameter", async () => {
      await read(undefined, undefined, "Germany");

      expect(state.chain.where).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
    });

    it("joins the location table to the property on its id, so a property without a location is left out", async () => {
      await read(undefined);

      expect(state.chain.innerJoin).toHaveBeenCalledWith("property_location", "pl", "pl.property_id = property.id");
      expect(state.chain.leftJoin).not.toHaveBeenCalledWith("property_location", expect.anything(), expect.anything());
    });

    it("reads only active properties, twelve at a time", async () => {
      await read(undefined);

      expect(state.chain.andWhere).toHaveBeenCalledWith("property.status = :status", { status: "ACTIVE" });
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

    it("hands the client, the query, the cursor and a scope to applyListingCursor", async () => {
      await read(cursor);

      expect(feed.applyListingCursor).toHaveBeenCalledTimes(1);
      expect(feed.applyListingCursor).toHaveBeenCalledWith(state.client, state.chain, cursor, expect.any(Function));
    });

    it("keeps the country filter on a later page", async () => {
      await read(cursor, undefined, "Germany");

      expect(state.chain.where).toHaveBeenCalledWith("pl.country = :country", { country: "Germany" });
    });

    feed.describeCursorContract({ read, state, buildChain });

    // A cursor taken from another country would otherwise be accepted and return a silently wrong page.
    describe("the country scope on the cursor lookup", () => {
      const lookupScopeFor = async (country) => {
        await read(cursor, undefined, country);
        return feed.applyListingCursor.mock.calls[0][3];
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

  feed.describeFeedResult(read);
});
