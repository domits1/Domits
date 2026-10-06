import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DestinationRepository } from "../../functions/PropertyHandler/data/repository/destinationRepository.js";
import { resolveDestinationChain } from "../../functions/PropertyHandler/business/service/destinationResolver.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";
const CHAIN = resolveDestinationChain({ country: "Spain", city: "Marbella" });
const SOURCE = { sourceCountry: "Spain", sourceCity: "Marbella" };
const sync = (chain = CHAIN, source = SOURCE) =>
  new DestinationRepository().syncPropertyDestination("property-1", chain, source);

const buildClient = ({
  mappingRecords = [{ property_id: "property-1" }],
  queryRows = [],
  failOn = null,
  conflicts = 0,
} = {}) => {
  const statements = [];
  let remainingConflicts = conflicts;
  const transactionRunner = {
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      if (failOn && statement.includes(failOn)) {
        throw new Error(`failed on ${failOn}`);
      }
      if (remainingConflicts > 0 && statement.includes("property_destination")) {
        remainingConflicts -= 1;
        throw Object.assign(new Error("OC000 change conflicts with another transaction"), { code: "40001" });
      }
      return statement.includes("property_destination")
        ? { records: mappingRecords, affected: mappingRecords.length }
        : { records: [], affected: 1 };
    }),
  };
  const queryRunner = {
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      return { records: queryRows, affected: queryRows.length };
    }),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    options: { schema: "main" },
    statements,
    committed: false,
    rolledBack: false,
    transaction: jest.fn(async (runInTransaction) => {
      try {
        const result = await runInTransaction({ queryRunner: transactionRunner });
        client.committed = true;
        return result;
      } catch (error) {
        client.rolledBack = true;
        throw error;
      }
    }),
    createQueryRunner: jest.fn(() => queryRunner),
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      return queryRows;
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

describe("the destination repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes the continent, country and city rows and the mapping in one transaction, keyed by path", async () => {
    const client = buildClient();

    const written = await sync(CHAIN, { ...SOURCE, now: 1700 });

    expect(written).toBe(true);
    expect(client.committed).toBe(true);
    const upserts = client.statements.filter(({ statement }) =>
      statement.includes(`INSERT INTO ${SCHEMA}.destination `)
    );
    const PATHS = ["/destinations/europe", "/destinations/europe/spain", "/destinations/europe/spain/marbella"];
    expect(upserts.map(({ parameters }) => parameters[0])).toEqual(PATHS);
    expect(upserts.map(({ parameters }) => parameters[2])).toEqual([null, PATHS[0], PATHS[1]]);
    expect(upserts[2].parameters.slice(0, 7)).toEqual([
      PATHS[2],
      "city",
      PATHS[1],
      "marbella",
      PATHS[2],
      "Marbella",
      "ES",
    ]);
    expect(upserts[0].parameters.slice(5, 7)).toEqual(["Europe", null]);
    expect(upserts[0].statement).toContain("ON CONFLICT (id)");
    expect(upserts[0].statement).toContain("WHERE d.display_name IS DISTINCT FROM EXCLUDED.display_name");
    expect(upserts[0].statement).not.toContain("slug = EXCLUDED");
    const mapping = client.statements.find(({ statement }) =>
      statement.includes(`INSERT INTO ${SCHEMA}.property_destination`)
    );
    expect(mapping.statement).toContain(`FROM ${SCHEMA}.property_location l`);
    expect(mapping.statement).toContain("AND l.country = $4");
    expect(mapping.statement).toContain("AND l.city = $5");
    expect(mapping.statement).toContain("ON CONFLICT (property_id)");
    expect(mapping.parameters).toEqual([
      "property-1",
      "/destinations/europe/spain/marbella",
      1700,
      "Spain",
      "Marbella",
    ]);
  });

  it("maps a property without a resolvable city to its country row and writes no city row", async () => {
    const client = buildClient();
    const countryOnly = resolveDestinationChain({ country: "Spain", city: " - " });

    const written = await sync(countryOnly, { sourceCountry: "Spain", sourceCity: " - ", now: 1700 });

    expect(written).toBe(true);
    const upserts = client.statements.filter(({ statement }) =>
      statement.includes(`INSERT INTO ${SCHEMA}.destination `)
    );
    expect(upserts.map(({ parameters }) => parameters[0])).toEqual([
      "/destinations/europe",
      "/destinations/europe/spain",
    ]);
    const mapping = client.statements.find(({ statement }) =>
      statement.includes(`INSERT INTO ${SCHEMA}.property_destination`)
    );
    expect(mapping.parameters).toEqual(["property-1", "/destinations/europe/spain", 1700, "Spain", " - "]);
  });

  it("binds the exact stored address into the write, and answers false when no location row matches it any more", async () => {
    const client = buildClient({ mappingRecords: [] });

    const written = await new DestinationRepository().syncPropertyDestination("property-1", CHAIN, {
      sourceCountry: " Spain ",
      sourceCity: "Marbella",
    });

    expect(written).toBe(false);
    expect(client.committed).toBe(true);
    const mapping = client.statements.find(({ statement }) => statement.includes("property_destination"));
    expect(mapping.statement).toContain(
      "WHERE l.property_id = $1\n        AND l.country = $4\n        AND l.city = $5"
    );
    expect(mapping.parameters.slice(3)).toEqual([" Spain ", "Marbella"]);
  });

  it("retries a transaction that lost a DSQL conflict, and gives up after three attempts", async () => {
    const client = buildClient({ conflicts: 2 });
    expect(await sync()).toBe(true);
    expect(client.transaction).toHaveBeenCalledTimes(3);

    const exhausted = buildClient({ conflicts: 3 });
    await expect(sync()).rejects.toThrow("OC000");
    expect(exhausted.transaction).toHaveBeenCalledTimes(3);
  });

  it("rolls everything back when one statement fails, and refuses an unresolved chain or empty source text", async () => {
    const client = buildClient({ failOn: "property_destination" });

    await expect(sync()).rejects.toThrow("failed on property_destination");
    expect(client.rolledBack).toBe(true);

    const unresolved = resolveDestinationChain({ country: "Narnia", city: "x" });
    await expect(sync(unresolved, { sourceCountry: "Narnia", sourceCity: "x" })).rejects.toThrow(
      "A resolved destination chain"
    );
    await expect(sync(CHAIN, { sourceCountry: " ", sourceCity: "x" })).rejects.toThrow(
      "The source country is required."
    );
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it("removes a mapping only while the location still carries the judged address, and says whether that address is still current", async () => {
    const client = buildClient({ queryRows: [{ property_id: "property-1" }] });
    const source = { sourceCountry: "Narnia", sourceCity: "Cair Paravel" };
    expect(await new DestinationRepository().removePropertyDestination("property-1", source)).toEqual({
      removed: true,
      current: true,
    });
    expect(client.statements[0].statement).toContain(`DELETE FROM ${SCHEMA}.property_destination m`);
    expect(client.statements[0].statement).toContain(`FROM ${SCHEMA}.property_location l`);
    expect(client.statements[0].statement).toContain("AND l.country = $2\n            AND l.city = $3");
    expect(client.statements[0].parameters).toEqual(["property-1", "Narnia", "Cair Paravel"]);

    const moved = buildClient({ queryRows: [] });
    expect(await new DestinationRepository().removePropertyDestination("property-9", source)).toEqual({
      removed: false,
      current: false,
    });
    expect(moved.statements[1].statement).toContain(`FROM ${SCHEMA}.property_location`);
    expect(moved.statements[1].parameters).toEqual(["property-9", "Narnia", "Cair Paravel"]);

    const unmapped = buildClient({ queryRows: [] });
    unmapped.query = jest.fn(async () => [{ "?column?": 1 }]);
    expect(await new DestinationRepository().removePropertyDestination("property-9", source)).toEqual({
      removed: false,
      current: true,
    });
  });

  it("reads only the country and city of a location for the mapping", async () => {
    buildClient({ queryRows: [{ property_id: "property-1", country: "Spain", city: "Marbella", street: "Calle 1" }] });
    const location = await new DestinationRepository().getLocationForMapping("property-1");
    expect(location).toEqual({ propertyId: "property-1", country: "Spain", city: "Marbella" });

    buildClient({ queryRows: [] });
    expect(await new DestinationRepository().getLocationForMapping("property-9")).toBeNull();
  });

  it("lists the properties whose mapping is missing or no longer matches their location, by cursor, with a bounded limit", async () => {
    const client = buildClient({ queryRows: [{ id: "property-2" }, { id: "property-3" }] });

    const ids = await new DestinationRepository().listPropertyIdsNeedingMapping({ after: "property-1", limit: 9999 });

    expect(ids).toEqual(["property-2", "property-3"]);
    const [{ statement, parameters }] = client.statements;
    expect(statement).toContain(`LEFT JOIN ${SCHEMA}.property_destination d ON d.property_id = p.id`);
    expect(statement).toContain("d.property_id IS NULL OR d.source_country <> l.country OR d.source_city <> l.city");
    expect(statement).toContain("WHERE p.id > $1");
    expect(statement).toContain("ORDER BY p.id ASC");
    expect(statement).not.toContain("status");
    expect(parameters).toEqual(["property-1", 500]);
  });
});
