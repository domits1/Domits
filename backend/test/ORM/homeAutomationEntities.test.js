import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { HomeAutomationDevice } from "database/models/homeAutomation/HomeAutomationDevice";
import { AccessCredential } from "database/models/homeAutomation/AccessCredential";
import { ACCESS_CREDENTIAL_STATUS } from "../../functions/.shared/homeAutomation/homeAutomationConstants.js";
import { Tables } from "../../ORM/util/database/Tables.js";

const MIGRATION_FILE = "20261008_create_home_automation.sql";
const SECRET_COLUMN = /(^|_)(pin|code|passcode|secret|token|password|otp)(_|$)/;

// column name -> [type, nullable]
const TABLES = [
  {
    table: "home_automation_device",
    entity: HomeAutomationDevice,
    columns: {
      id: ["varchar", false],
      integration_account_id: ["varchar", false],
      provider_device_id: ["varchar", false],
      property_id: ["varchar", false],
      unit_id: ["varchar", true],
      device_type: ["varchar", false],
      name: ["varchar", true],
      capabilities: ["text", true],
      status: ["varchar", false],
      battery_level: ["int", true],
      last_seen_at: ["bigint", true],
      created_at: ["bigint", false],
      updated_at: ["bigint", false],
    },
    indexes: [
      ["UNIQUE ", "home_automation_device_provider_unique", "integration_account_id, provider_device_id"],
      ["", "home_automation_device_property_id_idx", "property_id"],
    ],
  },
  {
    table: "access_credential",
    entity: AccessCredential,
    columns: {
      id: ["varchar", false],
      integration_account_id: ["varchar", false],
      booking_id: ["varchar", false],
      property_id: ["varchar", false],
      device_id: ["varchar", false],
      guest_id: ["varchar", true],
      provider_credential_id: ["varchar", true],
      credential_type: ["varchar", false],
      status: ["varchar", false],
      valid_from: ["bigint", false],
      valid_until: ["bigint", false],
      revoked_at: ["bigint", true],
      failure_reason: ["text", true],
      created_at: ["bigint", false],
      updated_at: ["bigint", false],
    },
    indexes: [
      ["UNIQUE ", "access_credential_booking_device_unique", "booking_id, device_id"],
      ["UNIQUE ", "access_credential_provider_credential_unique", "integration_account_id, provider_credential_id"],
    ],
  },
];

const loadMetadata = async (entity) => {
  const dataSource = new DataSource({ type: "postgres", entities: [entity] });
  await dataSource.buildMetadatas();
  return dataSource.getMetadata(entity);
};

// Normalised, because a Windows checkout may have converted the file to CRLF.
const loadMigrationSql = () =>
  readFileSync(path.join(process.cwd(), "ORM", "migrations", MIGRATION_FILE), "utf8").replaceAll("\r\n", "\n");

const createTableBlock = (sql, qualifiedTable) => {
  const match = new RegExp(
    String.raw`CREATE TABLE IF NOT EXISTS ${qualifiedTable.replace(".", String.raw`\.`)} \(([\s\S]*?)\n\);`
  ).exec(sql);
  if (!match) throw new Error(`No CREATE TABLE block found for ${qualifiedTable}`);
  return match[1];
};

const sqlColumns = (sql, qualifiedTable) =>
  createTableBlock(sql, qualifiedTable)
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);

describe.each(TABLES)("$table", ({ table, entity, columns, indexes }) => {
  it("maps the columns, types and nullability of the migration", async () => {
    const metadata = await loadMetadata(entity);
    const mapped = Object.fromEntries(metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable]]));
    expect(metadata.tableName).toBe(table);
    expect(mapped).toEqual(columns);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["id"]);
  });

  it.each(["test", "main"])("declares the same columns in the %s schema of the migration SQL", (schema) => {
    expect(sqlColumns(loadMigrationSql(), `${schema}.${table}`).sort()).toEqual(Object.keys(columns).sort());
  });

  it.each(["test", "main"])("declares its indexes with CREATE INDEX ASYNC in the %s schema", (schema) => {
    const suffix = schema === "test" ? "_test" : "";
    indexes.forEach(([unique, name, keyColumns]) => {
      expect(loadMigrationSql()).toContain(
        `CREATE ${unique}INDEX ASYNC IF NOT EXISTS ${name}${suffix}\nON ${schema}.${table} (${keyColumns});`
      );
    });
  });

  // Aurora DSQL has no foreign keys, and a column constraint cannot be altered later.
  it.each(["test", "main"])("declares no foreign key or CHECK constraint in the %s schema", (schema) => {
    expect(createTableBlock(loadMigrationSql(), `${schema}.${table}`)).not.toMatch(
      /FOREIGN KEY|REFERENCES|CHECK\s*\(/i
    );
  });
});

describe("access_credential", () => {
  it("has no column that could hold a PIN, code or secret", () => {
    const { columns } = TABLES[1];
    expect(Object.keys(columns).filter((name) => SECRET_COLUMN.test(name))).toEqual([]);
    ["test", "main"].forEach((schema) => {
      expect(
        sqlColumns(loadMigrationSql(), `${schema}.access_credential`).filter((n) => SECRET_COLUMN.test(n))
      ).toEqual([]);
    });
  });

  it("defaults the status to PENDING in the entity and the migration", async () => {
    const metadata = await loadMetadata(AccessCredential);
    expect(metadata.findColumnWithDatabaseName("status").default).toBe(ACCESS_CREDENTIAL_STATUS.PENDING);
    ["test", "main"].forEach((schema) => {
      expect(createTableBlock(loadMigrationSql(), `${schema}.access_credential`)).toContain(
        "status VARCHAR(20) NOT NULL DEFAULT 'PENDING'"
      );
    });
  });
});

describe("Tables registration", () => {
  // Every Lambda loads this list at boot, so a missing or broken entry affects all of them.
  it("registers both entities and builds the full entity list", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: Tables });
    await dataSource.buildMetadatas();
    const tableNames = dataSource.entityMetadatas.map((metadata) => metadata.tableName);
    expect(tableNames).toEqual(expect.arrayContaining(["home_automation_device", "access_credential"]));
  });
});

describe("migration SQL", () => {
  it("has no DDL inside a BEGIN block", () => {
    const blocks = [...loadMigrationSql().matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);
    expect(blocks).toHaveLength(2);
    blocks.forEach((block) => expect(block).not.toMatch(/\b(CREATE|ALTER|DROP)\b/));
  });
});
