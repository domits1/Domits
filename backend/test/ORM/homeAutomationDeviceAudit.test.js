import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { HomeAutomationDeviceAudit } from "database/models/homeAutomation/HomeAutomationDeviceAudit";
import { Tables } from "../../ORM/util/database/Tables.js";
import { Tables as IntegrationTables } from "../../functions/.shared/integrations/ORM/util/database/Tables.js";
import {
  createTableBlock,
  loadMetadata,
  loadMigrationSql as loadMigrationFile,
  smokeBlocks,
  sqlColumnDefinitions,
} from "./support/migrationSqlTestHelpers.js";

const MIGRATION_FILE = "20261023_create_home_automation_device_audit.sql";
const ROLLBACK_FILE = "20261023_create_home_automation_device_audit_rollback.sql";
const TABLE = "home_automation_device_audit";
const INDEX = "home_automation_device_audit_account_created_idx";
const SECRET_COLUMN = /(^|_)(pin|code|passcode|secret|token|password|otp|name)(_|$)/;

// column name -> [type, nullable, varchar length or null]
const COLUMNS = {
  id: ["varchar", false, 255],
  integration_account_id: ["varchar", false, 255],
  user_id: ["varchar", false, 255],
  provider_device_id: ["varchar", false, 255],
  action: ["varchar", false, 20],
  old_property_id: ["varchar", true, 255],
  new_property_id: ["varchar", true, 255],
  created_at: ["bigint", false, null],
};

describe(TABLE, () => {
  it("maps the columns, types, nullability and lengths that the migration declares", async () => {
    const metadata = await loadMetadata(HomeAutomationDeviceAudit);
    const mapped = Object.fromEntries(
      metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable, c.length ? Number(c.length) : null]])
    );
    expect(metadata.tableName).toBe(TABLE);
    expect(mapped).toEqual(COLUMNS);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["id"]);
  });

  it.each(["test", "main"])("declares the same types, nullability and lengths in the %s schema", (schema) => {
    expect(sqlColumnDefinitions(loadMigrationFile(MIGRATION_FILE), `${schema}.${TABLE}`)).toEqual(COLUMNS);
  });

  it.each(["test", "main"])("declares its one index with CREATE INDEX ASYNC in the %s schema", (schema) => {
    const suffix = schema === "test" ? "_test" : "";
    expect(loadMigrationFile(MIGRATION_FILE)).toContain(
      `CREATE INDEX ASYNC IF NOT EXISTS ${INDEX}${suffix}\nON ${schema}.${TABLE} (integration_account_id, created_at);`
    );
  });

  it("creates no other index, and no unique one", () => {
    const indexes = loadMigrationFile(MIGRATION_FILE).match(/CREATE (?:UNIQUE )?INDEX[^\n]*/g);
    expect(indexes).toEqual([
      `CREATE INDEX ASYNC IF NOT EXISTS ${INDEX}_test`,
      `CREATE INDEX ASYNC IF NOT EXISTS ${INDEX}`,
    ]);
  });

  // Aurora DSQL has no foreign keys, and a column constraint cannot be altered later.
  it.each(["test", "main"])("declares no foreign key or CHECK constraint in the %s schema", (schema) => {
    expect(createTableBlock(loadMigrationFile(MIGRATION_FILE), `${schema}.${TABLE}`)).not.toMatch(
      /FOREIGN KEY|REFERENCES|CHECK\s*\(/i
    );
  });

  // The log holds ids only; a device name or a token in a row would outlive the mapping it describes.
  it("has no column that could hold a name, PIN, code or secret", () => {
    expect(Object.keys(COLUMNS).filter((name) => SECRET_COLUMN.test(name))).toEqual([]);
  });

  it("drops the index before the table in the rollback, main first", () => {
    const statements = loadMigrationFile(ROLLBACK_FILE).match(/DROP [^\n]*/g);
    expect(statements).toEqual([
      `DROP INDEX IF EXISTS main.${INDEX};`,
      `DROP TABLE IF EXISTS main.${TABLE};`,
      `DROP INDEX IF EXISTS test.${INDEX}_test;`,
      `DROP TABLE IF EXISTS test.${TABLE};`,
    ]);
  });
});

describe("Tables registration", () => {
  // Every Lambda loads these lists at boot, so a missing or broken entry affects all of them.
  it.each([
    ["backend/ORM", Tables],
    ["the shared integrations ORM", IntegrationTables],
  ])("registers the entity in %s and builds the full entity list", async (_label, tables) => {
    const dataSource = new DataSource({ type: "postgres", entities: tables });
    await dataSource.buildMetadatas();
    expect(dataSource.entityMetadatas.map((metadata) => metadata.tableName)).toContain(TABLE);
  });
});

describe("migration SQL smoke tests", () => {
  const UNIQUE_CHECKS = ["same_account_device_rows_should_be_four", "duplicate_id_rows_should_be_one"].map(
    (name) => new RegExp(String.raw`\b${name}\b`)
  );

  it.each(["test", "main"])("checks that audit rows are kept and a duplicate id is not in the %s schema", (schema) => {
    const block = smokeBlocks(loadMigrationFile(MIGRATION_FILE)).find((candidate) =>
      candidate.includes(`INTO ${schema}.`)
    );
    UNIQUE_CHECKS.forEach((check) => expect(block).toMatch(check));
  });

  // Whole-table counts would fail on the first real row, and the check exists to prove the ROLLBACK left nothing.
  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = loadMigrationFile(MIGRATION_FILE);
    const finalCheck = sql.slice(sql.lastIndexOf("ROLLBACK;"));
    const insertedIds = smokeBlocks(sql).flatMap((block) =>
      [...block.matchAll(/INSERT INTO \w+\.\w+ \([^)]*\)\s*VALUES \('([^']+)'/g)].map((match) => match[1])
    );

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(2);
    expect(finalCheck.match(/WHERE id IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(2);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}')`));
  });
});

describe("migration SQL", () => {
  it("has no DDL inside a BEGIN block", () => {
    const blocks = smokeBlocks(loadMigrationFile(MIGRATION_FILE));
    expect(blocks).toHaveLength(2);
    blocks.forEach((block) => expect(block).not.toMatch(/\b(CREATE|ALTER|DROP)\b/));
  });
});
