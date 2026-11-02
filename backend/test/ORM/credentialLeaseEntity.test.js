import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { CredentialLease } from "database/models/homeAutomation/CredentialLease";
import { Tables } from "../../ORM/util/database/Tables.js";
import { extractCreateTableBlock, loadMigrationSql } from "./schemaSql.js";

const MIGRATION_FILE = "20261014_create_home_automation_credential_lease.sql";
const ROLLBACK_FILE = "20261014_create_home_automation_credential_lease_rollback.sql";
const TABLE = "home_automation_credential_lease";

// column name -> [type, nullable, varchar length or null]
const COLUMNS = {
  integration_account_id: ["varchar", false, 255],
  owner_id: ["varchar", false, 255],
  lease_expires_at: ["bigint", false, null],
  created_at: ["bigint", false, null],
  updated_at: ["bigint", false, null],
};

const SMOKE_CHECKS = [
  "free_acquire_owner_should_be_a",
  "held_acquire_should_return_no_row",
  "owner_with_margin_should_return_one_row",
  "margin_above_remaining_should_return_no_row",
  "other_owner_should_return_no_row",
  "expired_takeover_owner_should_be_b",
  "wrong_owner_release_should_return_no_row",
  "owner_release_should_return_b",
  "expires_after_release_should_be_zero",
];

const SQL_TYPES = { varchar: "varchar", text: "text", integer: "int", bigint: "bigint" };

// Normalised, because a Windows checkout may have converted the files to CRLF.
const sqlOf = (fileName) => loadMigrationSql(fileName).replaceAll("\r\n", "\n");

const sqlColumnDefinitions = (sql, qualifiedTable) =>
  Object.fromEntries(
    extractCreateTableBlock(sql, qualifiedTable)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, typeToken] = line.split(/\s+/);
        const [, typeName, length] = /^(\w+)(?:\((\d+)\))?/.exec(typeToken);
        return [name, [SQL_TYPES[typeName.toLowerCase()], !/\bNOT NULL\b/i.test(line), length ? Number(length) : null]];
      })
  );

const smokeBlocks = (sql) => [...sql.matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);

const loadMetadata = async () => {
  const dataSource = new DataSource({ type: "postgres", entities: [CredentialLease] });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(CredentialLease);
};

describe("home_automation_credential_lease", () => {
  it("maps the columns, types, nullability and lengths that the migration declares", async () => {
    const metadata = await loadMetadata();
    const mapped = Object.fromEntries(
      metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable, c.length ? Number(c.length) : null]])
    );

    expect(metadata.tableName).toBe(TABLE);
    expect(mapped).toEqual(COLUMNS);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["integration_account_id"]);
  });

  it.each(["test", "main"])(
    "declares the same types, nullability and lengths in the %s schema of the SQL",
    (schema) => {
      expect(sqlColumnDefinitions(sqlOf(MIGRATION_FILE), `${schema}.${TABLE}`)).toEqual(COLUMNS);
    }
  );

  it.each(["test", "main"])("keys the %s table by the account with a primary key, not an async index", (schema) => {
    expect(extractCreateTableBlock(sqlOf(MIGRATION_FILE), `${schema}.${TABLE}`)).toContain(
      "integration_account_id VARCHAR(255) NOT NULL PRIMARY KEY"
    );
    expect(sqlOf(MIGRATION_FILE)).not.toMatch(/CREATE\s+(UNIQUE\s+)?INDEX/);
  });

  // Aurora DSQL has no foreign keys, and a column constraint cannot be altered later.
  it.each(["test", "main"])("declares no foreign key or CHECK constraint in the %s schema", (schema) => {
    expect(extractCreateTableBlock(sqlOf(MIGRATION_FILE), `${schema}.${TABLE}`)).not.toMatch(
      /FOREIGN KEY|REFERENCES|CHECK\s*\(/i
    );
  });

  it("has no DDL inside a BEGIN block, and no comments in the SQL files", () => {
    const sql = sqlOf(MIGRATION_FILE);

    expect(smokeBlocks(sql)).toHaveLength(2);
    smokeBlocks(sql).forEach((block) => expect(block).not.toMatch(/\b(CREATE|ALTER|DROP)\b/));
    [sql, sqlOf(ROLLBACK_FILE)].forEach((text) => expect(text).not.toMatch(/--|\/\*/));
  });

  it.each(["test", "main"])("smoke-tests free, held, expired and owner-only release in the %s schema", (schema) => {
    const block = smokeBlocks(sqlOf(MIGRATION_FILE)).find((candidate) => candidate.includes(`INTO ${schema}.`));

    SMOKE_CHECKS.forEach((check) => expect(block).toMatch(new RegExp(String.raw`\b${check}\b`)));
  });

  // Whole-table counts would fail on the first real row, and the check exists to prove the ROLLBACK left nothing.
  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = sqlOf(MIGRATION_FILE);
    const finalCheck = sql.slice(sql.lastIndexOf("ROLLBACK;"));
    const insertedIds = smokeBlocks(sql).flatMap((block) =>
      [...block.matchAll(/INSERT INTO \w+\.\w+ AS lease \([^)]*\)\s*SELECT '([^']+)'/g)].map((match) => match[1])
    );

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(2);
    expect(finalCheck.match(/IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(2);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}')`));
  });

  it("rolls back both schemas, main first", () => {
    expect(sqlOf(ROLLBACK_FILE).match(/DROP TABLE IF EXISTS (\w+)\./g)).toEqual([
      "DROP TABLE IF EXISTS main.",
      "DROP TABLE IF EXISTS test.",
    ]);
  });

  it("is registered, and the full entity list still builds", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();

    expect(dataSource.entityMetadatas.map((metadata) => metadata.tableName)).toContain(TABLE);
  });
});
