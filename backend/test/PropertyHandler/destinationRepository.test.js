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

const conflictError = () =>
  Object.assign(new Error("OC000 change conflicts with another transaction"), { code: "40001" });

const buildClient = ({
  mappingRecords = [{ property_id: "property-1" }],
  queryRows = [],
  failOn = null,
  conflicts = 0,
  storedNames = {},
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
      throw conflictError();
    }
    if (statement.trim().startsWith("SELECT id, display_name")) {
      return { records: Object.entries(storedNames).map(([id, display_name]) => ({ id, display_name })) };
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
      "SELECT id, display_name",
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.property_destination`,
    ]);
    expect(client.statements[0].parameters).toEqual(PATHS);
    const upserts = client.statements.slice(1, 4);
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
    expect(upserts.map(({ parameters }) => parameters[8])).toEqual([true, true, true]);
    expect(upserts[0].statement).toContain(
      "WHERE $9::boolean AND d.display_name IS DISTINCT FROM EXCLUDED.display_name"
    );
    const mapping = client.statements[4];
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
    expect(client.statements.map(({ parameters }) => parameters[0])).toEqual([
      PATHS[0],
      PATHS[0],
      PATHS[1],
      "property-1",
    ]);
    expect(client.statements.at(-1).parameters).toEqual(["property-1", PATHS[1], 1, "Spain", " - "]);
  });

  it("lets a city name replace the stored one only when it is not a weaker spelling", async () => {
    const cases = [
      ["Spain", "Marbella", "marbella", false],
      ["Spain", "Marbella", "MARBELLA", false],
      ["Spain", "MARBELLA", "Marbella", true],
      ["Spain", "marbella", "MARBELLA", true],
      ["Spain", undefined, "marbella", true],
      ["Portugal", "Évora", "évora", false],
    ];
    for (const [country, stored, written, expected] of cases) {
      const chain = resolveDestinationChain({ country, city: written });
      const client = buildClient({ storedNames: stored ? { [chain.city.path]: stored } : {} });
      await sync(chain, { sourceCountry: country, sourceCity: written });
      expect([stored, written, client.statements[3].parameters[8]]).toEqual([stored, written, expected]);
    }
  });

  it("ends with the capitalised city name whatever order a host save, a backfill or a lost conflict write it in", async () => {
    const run = async (writes, concurrentName = null) => {
      const table = new Map();
      let pending = concurrentName;
      const answer = async (statement, parameters) => {
        if (statement.trim().startsWith("SELECT id, display_name")) {
          return { records: [...table].map(([id, display_name]) => ({ id, display_name })) };
        }
        if (!statement.includes(`INSERT INTO ${SCHEMA}.destination`))
          return { records: [{ property_id: "property-1" }] };
        const [id, type, , , , name, , , mayRename] = parameters;
        if (pending && type === "city") {
          table.set(id, pending);
          pending = null;
          throw conflictError();
        }
        if (!table.has(id) || (mayRename && table.get(id) !== name)) table.set(id, name);
        return { records: [] };
      };
      const client = { options: { schema: "main" }, transaction: (work) => work({ queryRunner: { query: answer } }) };
      Database.getInstance.mockResolvedValue(client);
      for (const city of writes)
        await sync(resolveDestinationChain({ country: "Netherlands", city }), {
          ...SOURCE,
          sourceCountry: "Netherlands",
          sourceCity: city,
        });
      return table.get("/destinations/europe/netherlands/amsterdam");
    };

    expect(await run(["Amsterdam", "amsterdam "])).toBe("Amsterdam");
    expect(await run(["amsterdam ", "Amsterdam"])).toBe("Amsterdam");
    expect(await run(["AMSTERDAM", "Amsterdam", "amsterdam"])).toBe("Amsterdam");
    expect(await run(["amsterdam"])).toBe("amsterdam");
    expect(await run(["amsterdam"], "Amsterdam")).toBe("Amsterdam");
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
