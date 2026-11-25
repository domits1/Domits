import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import {
  columnLines,
  describeOrmConsistency,
  inserts,
  itCountsOnlySmokeRowsInFinalCheck,
  itEndsEveryTransactionInRollback,
  loadMetadata,
  parseInsert,
  readOrmFile,
  recordQueries,
  smokeBlocks,
  statements,
} from "./support/ormConsistencyTestHelpers.js";
import { Property_Owner } from "database/models/Property_Owner";
import { Property_Owner_Property } from "database/models/Property_Owner_Property";
import { Tables } from "../../ORM/util/database/Tables.js";
import { PropertyOwner20261016 } from "../../ORM/migrations/20261016_property_owner.js";

const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

const TABLES = [
  {
    table: "property_owner",
    entity: Property_Owner,
    columns: {
      id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      first_name: ["varchar", false, 100],
      last_name: ["varchar", false, 100],
      company_name: ["varchar", true, 200],
      email: ["varchar", false, 254],
      phone: ["varchar", true, 50],
      preferred_language: ["varchar", true, 10],
      owner_type: ["varchar", false, 20],
      status: ["varchar", false, 20],
      notes: ["text", true, null],
      owner_user_id: ["varchar", true, 255],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
    },
    indexes: [["", "property_owner_host_id_idx", "host_id", ""]],
    checks: [],
  },
  {
    table: "property_owner_property",
    entity: Property_Owner_Property,
    columns: {
      id: ["uuid", false, null],
      owner_id: ["uuid", false, null],
      property_id: ["varchar", false, 255],
      host_id: ["varchar", false, 255],
      ownership_basis_points: ["int", false, null],
      effective_from: ["bigint", false, null],
      effective_to: ["bigint", true, null],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "property_owner_property_owner_property_from_unique", "owner_id, property_id, effective_from", ""],
      ["UNIQUE ", "property_owner_property_open_unique", "owner_id, property_id", "effective_to IS NULL"],
      ["", "property_owner_property_property_id_idx", "property_id", ""],
      ["", "property_owner_property_host_id_idx", "host_id", ""],
    ],
    checks: [
      ["property_owner_property_basis_points_check", "ownership_basis_points BETWEEN 1 AND 10000"],
      ["property_owner_property_period_check", "effective_to IS NULL OR effective_to > effective_from"],
    ],
  },
];

const SOURCES = [
  ["20261016_property_owner.sql", async () => readOrmFile("migrations", "20261016_property_owner.sql")],
  ["schema.psql", async () => readOrmFile("schema.psql")],
  ["20261016_property_owner.js up()", () => recordQueries((runner) => new PropertyOwner20261016().up(runner))],
];

const DROP_SOURCES = [
  ["20261016_property_owner_rollback.sql", async () => readOrmFile("migrations", "20261016_property_owner_rollback.sql")],
  ["20261016_property_owner.js down()", () => recordQueries((runner) => new PropertyOwner20261016().down(runner))],
];

describeOrmConsistency({ tables: TABLES, schemas: SCHEMAS, sources: SOURCES, dropSources: DROP_SOURCES });

describe.each(SOURCES)("%s", (_label, loadSql) => {
  it.each(SCHEMAS)("defaults property_owner.status to active for $schema", async ({ schema }) => {
    expect(columnLines(await loadSql(), `${schema}.property_owner`)).toContain(
      "status VARCHAR(20) NOT NULL DEFAULT 'active'"
    );
  });
});

describe("property_owner entity defaults", () => {
  it("defaults status to active, as the table does", async () => {
    const metadata = await loadMetadata(Property_Owner);
    expect(metadata.findColumnWithDatabaseName("status").default).toBe("active");
  });
});

describe("migration SQL smoke tests", () => {
  const migrationSql = () => readOrmFile("migrations", "20261016_property_owner.sql");

  const assignmentsById = (block, schema) =>
    Object.fromEntries(
      inserts(block)
        .filter((insert) => insert.table === `${schema}.property_owner_property`)
        .map((insert) => [insert.row.id, insert])
    );

  const positiveBlock = (schema) =>
    smokeBlocks(migrationSql()).find((block) =>
      inserts(block).some((insert) => insert.table === `${schema}.property_owner`)
    );

  const negativeInserts = (schema) =>
    smokeBlocks(migrationSql())
      .map(statements)
      .filter((blockStatements) => blockStatements.length === 1)
      .map(([statement]) => parseInsert(statement))
      .filter((insert) => insert?.table === `${schema}.property_owner_property`);

  const smokeId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;

  const conflictKey = ({ owner_id, property_id }) => ({ owner_id, property_id });

  const expectedSmokeQueries = (schema, open) => {
    const owner = `owner_id = '${open.owner_id}'`;
    const property = `property_id = '${open.property_id}'`;
    return [
      [
        "default_status_should_be_active",
        `SELECT status AS default_status_should_be_active FROM ${schema}.property_owner`,
        [`id = '${open.owner_id}'`],
      ],
      [
        "should_be_one",
        `SELECT count(*) AS should_be_one FROM ${schema}.property_owner_property`,
        [owner, property, `effective_from = ${open.effective_from}`],
      ],
      [
        "periods_should_be_two",
        `SELECT count(*) AS periods_should_be_two FROM ${schema}.property_owner_property`,
        [owner, property],
      ],
      [
        "open_should_be_one",
        `SELECT count(*) AS open_should_be_one FROM ${schema}.property_owner_property`,
        [owner, property, "effective_to IS NULL"],
      ],
      [
        "owners_should_be_two",
        `SELECT count(DISTINCT owner_id) AS owners_should_be_two FROM ${schema}.property_owner_property`,
        [property, "effective_to IS NULL"],
      ],
    ];
  };

  it.each(SCHEMAS)("inserts the rows that collide with each unique index with ON CONFLICT DO NOTHING in $schema", ({ schema }) => {
    const rows = assignmentsById(positiveBlock(schema), schema);
    const open = rows[smokeId(4)];
    const sameStart = rows[smokeId(5)];
    const secondOpen = rows[smokeId(6)];
    const otherOwner = rows[smokeId(7)];

    expect(open).toMatchObject({ onConflictDoNothing: false, row: { effective_to: null } });

    expect(sameStart).toMatchObject({ onConflictDoNothing: true, row: conflictKey(open.row) });
    expect(sameStart.row.effective_from).toBe(open.row.effective_from);
    expect(sameStart.row.effective_to).not.toBeNull();

    expect(secondOpen).toMatchObject({ onConflictDoNothing: true, row: { ...conflictKey(open.row), effective_to: null } });
    expect(secondOpen.row.effective_from).not.toBe(open.row.effective_from);

    expect(otherOwner).toMatchObject({
      onConflictDoNothing: false,
      row: { property_id: open.row.property_id, effective_to: null },
    });
    expect(otherOwner.row.owner_id).not.toBe(open.row.owner_id);
  });

  it.each(SCHEMAS)("filters each smoke query on the condition it checks in $schema", ({ schema }) => {
    const block = positiveBlock(schema);
    const open = assignmentsById(block, schema)[smokeId(4)].row;

    expectedSmokeQueries(schema, open).forEach(([alias, head, conditions]) => {
      const query = statements(block).find((statement) => new RegExp(String.raw`\bAS ${alias}\b`).test(statement));
      const [actualHead, where = ""] = query.split(" WHERE ");
      expect(actualHead).toBe(head);
      expect(where.split(" AND ").filter(Boolean).sort()).toEqual([...conditions].sort());
    });
  });

  it.each(SCHEMAS)("tries each CHECK in its own rolled back block in $schema", ({ schema }) => {
    const negatives = negativeInserts(schema).map(({ row }) => row);
    const zeroShare = negatives.filter((row) => row.ownership_basis_points === "0");
    const emptyPeriod = negatives.filter((row) => row.effective_to === row.effective_from);

    expect(negatives).toHaveLength(2);
    expect(zeroShare).toHaveLength(1);
    expect(zeroShare[0].effective_to).toBeNull();
    expect(emptyPeriod).toHaveLength(1);
    expect(Number(emptyPeriod[0].ownership_basis_points)).toBeGreaterThanOrEqual(1);
    expect(Number(emptyPeriod[0].ownership_basis_points)).toBeLessThanOrEqual(10000);
  });

  itEndsEveryTransactionInRollback(migrationSql);

  itCountsOnlySmokeRowsInFinalCheck(migrationSql, SCHEMAS.length * TABLES.length);
});

describe("Tables registration", () => {
  it("registers both entities and builds the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    const tableNames = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    expect(tableNames).toEqual(expect.arrayContaining(["property_owner", "property_owner_property"]));
  });
});
