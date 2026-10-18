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
const PATHS = ["/destinations/europe", "/destinations/europe/spain", "/destinations/europe/spain/marbella"];
const sync = (chain = CHAIN, source = SOURCE) =>
  new DestinationRepository().syncPropertyDestination("property-1", chain, source);
const remove = (source = { sourceCountry: "Narnia", sourceCity: "Cair Paravel" }) =>
  new DestinationRepository().removePropertyDestination("property-1", source);

const buildClient = ({
  mappingRecords = [{ property_id: "property-1" }],
  queryRows = [],
  failOn = null,
  conflicts = 0,
} = {}) => {
  const statements = [];
  let remainingConflicts = conflicts;
  const answer = async (statement, parameters) => {
    statements.push({ statement, parameters });
    if (failOn && statement.includes(failOn)) {
      throw new Error(`failed on ${failOn}`);
    }
    if (remainingConflicts > 0 && statement.includes("property_destination")) {
      remainingConflicts -= 1;
      throw Object.assign(new Error("OC000 change conflicts with another transaction"), { code: "40001" });
    }
    return { records: statement.includes("property_destination") ? mappingRecords : [] };
  };
  const client = {
    options: { schema: "main" },
    statements,
    committed: false,
    rolledBack: false,
    transaction: jest.fn(async (runInTransaction) => {
      try {
        const result = await runInTransaction({ queryRunner: { query: jest.fn(answer) } });
        client.committed = true;
        return result;
      } catch (error) {
        client.rolledBack = true;
        throw error;
      }
    }),
    createQueryRunner: jest.fn(() => ({ query: jest.fn(answer), release: jest.fn().mockResolvedValue(undefined) })),
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      return queryRows;
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const kinds = (client) => client.statements.map(({ statement }) => statement.trim().split(/\s+/).slice(0, 3).join(" "));

describe("the destination repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes the chain rows and the mapping in one transaction, from the stored address of a property that exists", async () => {
    const client = buildClient();

    expect(await sync(CHAIN, { ...SOURCE, now: 1700 })).toBe(true);

    expect(client.committed).toBe(true);
    expect(kinds(client)).toEqual([
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.property_destination`,
    ]);
    const upserts = client.statements.slice(0, 3);
    expect(upserts.map(({ parameters }) => [parameters[0], parameters[2]])).toEqual([
      [PATHS[0], null],
      [PATHS[1], PATHS[0]],
      [PATHS[2], PATHS[1]],
    ]);
    expect(upserts[2].parameters.slice(0, 7)).toEqual([
      PATHS[2],
      "city",
      PATHS[1],
      "marbella",
      PATHS[2],
      "Marbella",
      "ES",
    ]);
    expect(upserts[0].statement).toContain("WHERE d.display_name IS DISTINCT FROM EXCLUDED.display_name");
    const mapping = client.statements[3];
    expect(mapping.statement).toContain(
      `JOIN ${SCHEMA}.property p ON p.id = l.property_id\n      WHERE l.property_id = $1\n        AND l.country = $4\n        AND l.city = $5`
    );
    expect(mapping.statement).toContain("ON CONFLICT (property_id)");
    expect(mapping.parameters).toEqual(["property-1", PATHS[2], 1700, "Spain", "Marbella"]);
  });

  it("maps a property without a resolvable city to its country row and writes no city row", async () => {
    const client = buildClient();
    const chain = resolveDestinationChain({ country: "Spain", city: " - " });
    expect(await sync(chain, { sourceCountry: "Spain", sourceCity: " - ", now: 1 })).toBe(true);
    expect(client.statements.map(({ parameters }) => parameters[0])).toEqual([PATHS[0], PATHS[1], "property-1"]);
    expect(client.statements.at(-1).parameters).toEqual(["property-1", PATHS[1], 1, "Spain", " - "]);
  });

  it("binds the exact stored address, and answers false when no location of an existing property carries it any more", async () => {
    const client = buildClient({ mappingRecords: [] });

    expect(await sync(CHAIN, { sourceCountry: " Spain ", sourceCity: "Marbella" })).toBe(false);

    expect(client.committed).toBe(true);
    expect(client.statements.at(-1).parameters.slice(3)).toEqual([" Spain ", "Marbella"]);
  });

  it("retries a transaction that lost a DSQL conflict, and gives up after three attempts", async () => {
    const client = buildClient({ conflicts: 2 });
    expect(await sync()).toBe(true);
    expect(client.transaction).toHaveBeenCalledTimes(3);

    const exhausted = buildClient({ conflicts: 3 });
    await expect(sync()).rejects.toThrow("OC000");
    expect(exhausted.transaction).toHaveBeenCalledTimes(3);
  });

  it("rejects when one statement fails so the transaction is not committed, and refuses an unresolved chain or an empty source country", async () => {
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
    const client = buildClient();
    expect(await remove()).toEqual({ removed: true, current: true });
    expect(client.statements[0].statement).toContain(`DELETE FROM ${SCHEMA}.property_destination m`);
    expect(client.statements[0].statement).toContain("AND l.country = $2\n        AND l.city = $3");
    expect(client.statements[0].parameters).toEqual(["property-1", "Narnia", "Cair Paravel"]);

    const moved = buildClient({ mappingRecords: [], queryRows: [] });
    expect(await remove()).toEqual({ removed: false, current: false });
    expect(moved.statements[1].statement).toContain(`FROM ${SCHEMA}.property_location l`);

    buildClient({ mappingRecords: [], queryRows: [{ "?column?": 1 }] });
    expect(await remove()).toEqual({ removed: false, current: true });
  });

  it("removes mapping rows whose property no longer exists in bounded batches, and can count them without removing", async () => {
    const full = Array.from({ length: 500 }, (_, index) => ({ property_id: `gone-${index}` }));
    const batches = [full, [{ property_id: "gone-last" }]];
    const client = buildClient({ queryRows: [{ orphans: "501" }] });
    client.createQueryRunner = jest.fn(() => ({
      query: jest.fn(async (statement, parameters) => {
        client.statements.push({ statement, parameters });
        return { records: batches.shift() };
      }),
      release: jest.fn().mockResolvedValue(undefined),
    }));
    const repository = new DestinationRepository();

    expect(await repository.deleteMappingsWithoutProperty()).toBe(501);
    expect(client.statements).toHaveLength(2);
    expect(client.statements[0].statement).toContain(
      `WHERE NOT EXISTS (SELECT 1 FROM ${SCHEMA}.property p WHERE p.id = m.property_id)\n        LIMIT $1`
    );
    expect(client.statements[0].parameters).toEqual([500]);
    expect(await repository.countMappingsWithoutProperty()).toBe(501);
    expect(client.statements[2].statement).toContain("SELECT count(*) AS orphans");
  });

  it("lists the properties whose mapping is missing or no longer matches their location, and reads only country and city", async () => {
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

    buildClient({ queryRows: [{ property_id: "property-1", country: "Spain", city: "Marbella", street: "Calle 1" }] });
    const location = await new DestinationRepository().getLocationForMapping("property-1");
    expect(location).toEqual({ propertyId: "property-1", country: "Spain", city: "Marbella" });
  });
});
