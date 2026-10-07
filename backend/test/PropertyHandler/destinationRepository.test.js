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
  claimRecords = [{ property_id: "property-1" }],
  propertyRecords = [{ id: "property-1" }],
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
      if (statement.startsWith("UPDATE")) {
        return { records: statement.includes("property_location") ? claimRecords : propertyRecords };
      }
      return { records: statement.includes("property_destination") ? mappingRecords : [] };
    }),
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
    createQueryRunner: jest.fn(() => {
      throw new Error("writes must run inside one transaction");
    }),
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

  it("claims the location row with the judged address and the property row, then writes the chain rows and the mapping, in one transaction", async () => {
    const client = buildClient();

    expect(await sync(CHAIN, { ...SOURCE, now: 1700 })).toBe(true);

    expect(client.committed).toBe(true);
    expect(kinds(client)).toEqual([
      `UPDATE ${SCHEMA}.property_location SET`,
      `UPDATE ${SCHEMA}.property SET`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.destination`,
      `INSERT INTO ${SCHEMA}.property_destination`,
    ]);
    const [claim, propertyClaim, ...rest] = client.statements;
    expect(propertyClaim.statement).toContain("SET updatedat = updatedat\n      WHERE id = $1\n      RETURNING id");
    expect(propertyClaim.parameters).toEqual(["property-1"]);
    expect(claim.statement).toContain(
      "SET city = city\n      WHERE property_id = $1\n        AND country = $2\n        AND city = $3"
    );
    expect(claim.parameters).toEqual(["property-1", "Spain", "Marbella"]);
    const upserts = rest.slice(0, 3);
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
    expect(rest[3].statement).toContain(
      `FROM ${SCHEMA}.property p\n      WHERE p.id = $1\n      ON CONFLICT (property_id)`
    );
    expect(rest[3].parameters).toEqual(["property-1", PATHS[2], "Spain", "Marbella", 1700]);

    const gone = buildClient({ propertyRecords: [] });
    expect(await sync()).toBe(false);
    expect(gone.statements).toHaveLength(2);
    expect(gone.committed).toBe(true);
  });

  it("maps a property without a resolvable city to its country row and writes no city row", async () => {
    const client = buildClient();
    const chain = resolveDestinationChain({ country: "Spain", city: " - " });
    expect(await sync(chain, { sourceCountry: "Spain", sourceCity: " - ", now: 1 })).toBe(true);
    expect(client.statements.map(({ parameters }) => parameters[0]).slice(2)).toEqual([
      PATHS[0],
      PATHS[1],
      "property-1",
    ]);
    expect(client.statements.at(-1).parameters).toEqual(["property-1", PATHS[1], "Spain", " - ", 1]);
  });

  it("writes nothing and answers false when no location row carries the judged address any more", async () => {
    const client = buildClient({ claimRecords: [] });

    expect(await sync(CHAIN, { sourceCountry: " Spain ", sourceCity: "Marbella" })).toBe(false);

    expect(client.statements).toHaveLength(1);
    expect(client.statements[0].parameters).toEqual(["property-1", " Spain ", "Marbella"]);
    expect(client.committed).toBe(true);
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

  it("removes a mapping only after claiming the location with the judged address, in one transaction, and says whether that address is still current", async () => {
    const client = buildClient();
    expect(await remove()).toEqual({ removed: true, current: true });
    expect(kinds(client)).toEqual([
      `UPDATE ${SCHEMA}.property_location SET`,
      `DELETE FROM ${SCHEMA}.property_destination`,
    ]);
    expect(client.statements[0].parameters).toEqual(["property-1", "Narnia", "Cair Paravel"]);
    expect(client.statements[1].parameters).toEqual(["property-1"]);
    expect(client.committed).toBe(true);

    const moved = buildClient({ claimRecords: [] });
    expect(await remove()).toEqual({ removed: false, current: false });
    expect(moved.statements).toHaveLength(1);

    buildClient({ mappingRecords: [] });
    expect(await remove()).toEqual({ removed: false, current: true });
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
