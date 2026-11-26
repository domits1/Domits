import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Document_Relationship } from "database/models/Document_Relationship";
import { Document_Activity } from "database/models/Document_Activity";
import { Tables } from "../../ORM/util/database/Tables.js";
import { DocumentRelationshipActivity20261126 } from "../../ORM/migrations/20261126_document_relationship_activity.js";
import {
  columnDefinitions,
  describeOrmConsistency,
  dropStatements,
  inserts,
  itCountsOnlySmokeRowsInFinalCheck,
  itEndsEveryTransactionInRollback,
  readOrmFile,
  recordQueries,
  smokeBlocks,
  statements,
} from "./support/ormConsistencyTestHelpers.js";

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;
const MIGRATION = "20261126_document_relationship_activity";

const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

const TABLES = [
  {
    table: "document_relationship",
    entity: Document_Relationship,
    columns: {
      id: ["uuid", false, null],
      document_id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      entity_type: ["varchar", false, 50],
      entity_id: ["varchar", false, 255],
      created_by: ["varchar", false, 255],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "document_relationship_document_entity_unique", "document_id, entity_type, entity_id", ""],
      ["", "document_relationship_host_id_entity_idx", "host_id, entity_type, entity_id", ""],
    ],
    checks: [],
  },
  {
    table: "document_activity",
    entity: Document_Activity,
    columns: {
      id: ["uuid", false, null],
      document_id: ["uuid", false, null],
      host_id: ["varchar", false, 255],
      actor_id: ["varchar", false, 255],
      action: ["varchar", false, 50],
      details: ["text", true, null],
      created_at: ["bigint", false, null],
    },
    indexes: [
      ["", "document_activity_document_id_created_at_idx", "document_id, created_at", ""],
      ["", "document_activity_host_id_idx", "host_id", ""],
    ],
    checks: [],
  },
];

const migrationFile = (suffix = "") => `${MIGRATION}${suffix}.sql`;
const migrationSql = () => readOrmFile("migrations", migrationFile());
const recordedMigration = (direction) => async () =>
  recordQueries((runner) => new DocumentRelationshipActivity20261126()[direction](runner));

const SOURCES = [
  [migrationFile(), async () => migrationSql()],
  ["schema.psql", async () => readOrmFile("schema.psql")],
  [`${MIGRATION}.js up()`, recordedMigration("up")],
];

const DROP_SOURCES = [
  [migrationFile("_rollback"), async () => readOrmFile("migrations", migrationFile("_rollback"))],
  [`${MIGRATION}.js down()`, recordedMigration("down")],
];

describeOrmConsistency({ tables: TABLES, schemas: SCHEMAS, sources: SOURCES, dropSources: DROP_SOURCES });

describe.each(SOURCES)("%s document_activity columns", (_label, loadSql) => {
  it.each(SCHEMAS)("keeps document_activity append-only, without updated_at, in $schema", async ({ schema }) => {
    expect(columnDefinitions(await loadSql(), `${schema}.document_activity`)).not.toHaveProperty("updated_at");
  });
});

describe("suffixed index names", () => {
  const indexNames = TABLES.flatMap(({ indexes }) => indexes.map(([, name]) => name)).flatMap((name) =>
    SCHEMAS.map(({ suffix }) => name + suffix)
  );

  it("stay within the PostgreSQL identifier limit and never repeat", () => {
    expect(Math.max(...indexNames.map(({ length }) => length))).toBeLessThanOrEqual(POSTGRES_MAX_IDENTIFIER_LENGTH);
    expect([...new Set(indexNames)]).toEqual(indexNames);
  });
});

describe.each(DROP_SOURCES)("%s schema order", (_label, loadSql) => {
  it("finishes main before it touches test", async () => {
    const dropped = dropStatements(await loadSql());
    const lastMain = dropped.findLastIndex((name) => name.startsWith("main."));
    const firstTest = dropped.findIndex((name) => name.startsWith("test."));
    expect([lastMain, firstTest]).toEqual([dropped.length / 2 - 1, dropped.length / 2]);
  });
});

describe("smoke blocks of the migration SQL", () => {
  const smokeId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const documentId = smokeId(1);
  const blockFor = (schema) => smokeBlocks(migrationSql()).find((block) => block.includes(`INSERT INTO ${schema}.`));
  const rowsIn = (schema, table) =>
    inserts(blockFor(schema))
      .filter((insert) => insert.table === `${schema}.${table}`)
      .map(({ row, onConflictDoNothing }) => ({ ...row, onConflictDoNothing }));

  itEndsEveryTransactionInRollback(migrationSql);

  itCountsOnlySmokeRowsInFinalCheck(migrationSql, SCHEMAS.length * TABLES.length);

  it("writes one smoke block per schema", () => {
    expect(SCHEMAS.map(({ schema }) => blockFor(schema)).filter(Boolean)).toHaveLength(SCHEMAS.length);
    expect(smokeBlocks(migrationSql())).toHaveLength(SCHEMAS.length);
  });

  it.each(SCHEMAS)(
    "links two entities and repeats the first only with ON CONFLICT DO NOTHING in $schema",
    ({ schema }) => {
      const links = rowsIn(schema, "document_relationship").map((link) => [
        link.id,
        link.document_id,
        link.entity_type,
        link.entity_id,
        link.onConflictDoNothing,
      ]);
      expect(links).toEqual([
        [smokeId(2), documentId, "smoke-entity-type", "smoke-entity-1", false],
        [smokeId(3), documentId, "smoke-entity-type", "smoke-entity-2", false],
        [smokeId(4), documentId, "smoke-entity-type", "smoke-entity-1", true],
      ]);
    }
  );

  it.each(SCHEMAS)("logs two activities of the smoke document in $schema", ({ schema }) => {
    const activities = rowsIn(schema, "document_activity").map((activity) => [
      activity.id,
      activity.document_id,
      activity.onConflictDoNothing,
    ]);
    expect(activities).toEqual([
      [smokeId(5), documentId, false],
      [smokeId(6), documentId, false],
    ]);
  });

  it.each(SCHEMAS)("counts the links and activities of the smoke document in $schema", ({ schema }) => {
    const counts = statements(blockFor(schema)).filter((statement) => statement.startsWith("SELECT "));
    expect(counts).toEqual(
      [
        ["relationships_should_be_two", "document_relationship"],
        ["activities_should_be_two", "document_activity"],
      ].map(
        ([alias, table]) => `SELECT count(*) AS ${alias} FROM ${schema}.${table} WHERE document_id = '${documentId}'`
      )
    );
  });
});

describe("Tables registration", () => {
  it("includes document_relationship and document_activity in the entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    const registered = new Set(dataSource.entityMetadatas.map(({ tableName }) => tableName));
    expect(["document_relationship", "document_activity"].filter((table) => !registered.has(table))).toEqual([]);
  });
});
