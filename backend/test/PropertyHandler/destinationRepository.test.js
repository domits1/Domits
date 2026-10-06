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

const buildClient = ({ mappingRecords = [{ property_id: "property-1" }], queryRows = [], failOn = null } = {}) => {
  const statements = [];
  const transactionRunner = {
    query: jest.fn(async (statement, parameters) => {
      statements.push({ statement, parameters });
      if (failOn && statement.includes(failOn)) {
        throw new Error(`failed on ${failOn}`);
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

    const written = await new DestinationRepository().syncPropertyDestination("property-1", CHAIN, {
      sourceCountry: "Spain",
      sourceCity: "Marbella",
      now: 1700,
    });

    expect(written).toBe(true);
    expect(client.committed).toBe(true);
    const upserts = client.statements.filter(({ statement }) =>
      statement.includes(`INSERT INTO ${SCHEMA}.destination `)
    );
    expect(upserts.map(({ parameters }) => parameters.slice(0, 7))).toEqual([
      ["/destinations/europe", "continent", null, "europe", "/destinations/europe", "Europe", null],
      [
        "/destinations/europe/spain",
        "country",
        "/destinations/europe",
        "spain",
        "/destinations/europe/spain",
        "Spain",
        "ES",
      ],
      [
        "/destinations/europe/spain/marbella",
        "city",
        "/destinations/europe/spain",
        "marbella",
        "/destinations/europe/spain/marbella",
        "Marbella",
        "ES",
      ],
    ]);
    expect(upserts[0].statement).toContain("ON CONFLICT (id)");
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

  it("answers false, without failing, when the location changed between the read and the write", async () => {
    const client = buildClient({ mappingRecords: [] });

    const written = await new DestinationRepository().syncPropertyDestination("property-1", CHAIN, {
      sourceCountry: "Spain",
      sourceCity: "Marbella",
    });

    expect(written).toBe(false);
    expect(client.committed).toBe(true);
  });

  it("rolls everything back when one statement fails, and refuses an unresolved chain or empty source text", async () => {
    const client = buildClient({ failOn: "property_destination" });
    const repository = new DestinationRepository();

    await expect(
      repository.syncPropertyDestination("property-1", CHAIN, { sourceCountry: "Spain", sourceCity: "Marbella" })
    ).rejects.toThrow("failed on property_destination");
    expect(client.rolledBack).toBe(true);

    const unresolved = resolveDestinationChain({ country: "Narnia", city: "x" });
    await expect(
      repository.syncPropertyDestination("property-1", unresolved, { sourceCountry: "Narnia", sourceCity: "x" })
    ).rejects.toThrow("A resolved destination chain is required.");
    await expect(
      repository.syncPropertyDestination("property-1", CHAIN, { sourceCountry: "Spain", sourceCity: " " })
    ).rejects.toThrow("The source city is required.");
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it("removes a mapping and says whether one was there", async () => {
    const client = buildClient({ queryRows: [{ property_id: "property-1" }] });
    expect(await new DestinationRepository().removePropertyDestination("property-1")).toBe(true);
    expect(client.statements[0].statement).toContain(`DELETE FROM ${SCHEMA}.property_destination`);
    expect(client.statements[0].parameters).toEqual(["property-1"]);

    buildClient({ queryRows: [] });
    expect(await new DestinationRepository().removePropertyDestination("property-9")).toBe(false);
  });

  it("reads only the country and city of a location for the mapping", async () => {
    buildClient({
      queryRows: [{ property_id: "property-1", country: "Spain", city: "Marbella", street: "Calle Secreta 1" }],
    });
    expect(await new DestinationRepository().getLocationForMapping("property-1")).toEqual({
      propertyId: "property-1",
      country: "Spain",
      city: "Marbella",
    });

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
