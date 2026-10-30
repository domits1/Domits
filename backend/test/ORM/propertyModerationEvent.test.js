import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { Property_Moderation_Event } from "database/models/Property_Moderation_Event";
import { Tables } from "../../ORM/util/database/Tables.js";
import {
  createTableBlock,
  loadMetadata,
  loadMigrationSql as loadMigrationFile,
  smokeBlocks,
  sqlColumnDefinitions,
} from "./support/migrationSqlTestHelpers.js";

const MIGRATION_FILE = "20261029_property_moderation_event.sql";
const ROLLBACK_FILE = "20261029_property_moderation_event_rollback.sql";
const TABLE = "property_moderation_event";
const INDEX = "property_moderation_event_property_created_idx";

const COLUMNS = {
  id: ["varchar", false, 255],
  property_id: ["varchar", false, 255],
  action: ["varchar", false, 20],
  actor_id: ["varchar", false, 255],
  reason: ["text", true, null],
  from_status: ["varchar", false, 50],
  to_status: ["varchar", false, 50],
  created_at: ["bigint", false, null],
};

describe(TABLE, () => {
  it("maps the columns, types, nullability and lengths that the migration declares", async () => {
    const metadata = await loadMetadata(Property_Moderation_Event);
    const mapped = Object.fromEntries(
      metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable, c.length ? Number(c.length) : null]])
    );
    expect(metadata.tableName).toBe(TABLE);
    expect(mapped).toEqual(COLUMNS);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["id"]);
  });

  it.each(["test", "main"])("declares the same columns in the %s schema", (schema) => {
    const sql = loadMigrationFile(MIGRATION_FILE);
    expect(sqlColumnDefinitions(sql, `${schema}.${TABLE}`)).toEqual(COLUMNS);
    expect(createTableBlock(sql, `${schema}.${TABLE}`)).not.toMatch(/FOREIGN KEY|REFERENCES|CHECK\s*\(|DEFAULT/i);
  });

  it("creates one non-unique async index per schema, with _test on the test schema", () => {
    const sql = loadMigrationFile(MIGRATION_FILE);
    expect(sql.match(/CREATE (?:UNIQUE )?INDEX[^\n]*\n[^\n]*/g)).toEqual([
      `CREATE INDEX ASYNC IF NOT EXISTS ${INDEX}_test\nON test.${TABLE} (property_id, created_at);`,
      `CREATE INDEX ASYNC IF NOT EXISTS ${INDEX}\nON main.${TABLE} (property_id, created_at);`,
    ]);
  });

  it("holds no comments in the SQL", () => {
    expect(loadMigrationFile(MIGRATION_FILE)).not.toMatch(/--|\/\*/);
  });

  it("drops the index before the table in the rollback, test first", () => {
    expect(loadMigrationFile(ROLLBACK_FILE).match(/DROP [^\n]*/g)).toEqual([
      `DROP INDEX IF EXISTS test.${INDEX}_test;`,
      `DROP TABLE IF EXISTS test.${TABLE};`,
      `DROP INDEX IF EXISTS main.${INDEX};`,
      `DROP TABLE IF EXISTS main.${TABLE};`,
    ]);
  });

  it("registers the entity in Tables and builds the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    expect(dataSource.entityMetadatas.map((metadata) => metadata.tableName)).toContain(TABLE);
  });
});

describe("migration SQL smoke tests", () => {
  it.each(["test", "main"])("keeps repeated events and a NULL reason on approval in the %s schema", (schema) => {
    const blocks = smokeBlocks(loadMigrationFile(MIGRATION_FILE));
    const block = blocks.find((candidate) => candidate.includes(`INTO ${schema}.`));
    expect(blocks).toHaveLength(2);
    expect(block).toMatch(/\bapproved_reason_null_should_be_one\b/);
    expect(block).toMatch(/\bproperty_events_should_be_two\b/);
    expect(block).not.toMatch(/\b(CREATE|ALTER|DROP)\b/);
  });
});
