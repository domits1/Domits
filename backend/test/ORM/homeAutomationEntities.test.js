import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";
import { HomeAutomationDevice } from "database/models/homeAutomation/HomeAutomationDevice";
import { AccessCredential } from "database/models/homeAutomation/AccessCredential";
import { ACCESS_CREDENTIAL_STATUS } from "../../functions/.shared/homeAutomation/homeAutomationConstants.js";
import { Tables } from "../../ORM/util/database/Tables.js";
import {
  createTableBlock,
  loadMetadata,
  loadMigrationSql as readMigrationSql,
  smokeBlocks,
  sqlColumnDefinitions,
  sqlColumns,
} from "./support/migrationSqlTestHelpers.js";

const MIGRATION_FILE = "20261008_create_home_automation.sql";
const SECRET_COLUMN = /(^|_)(pin|code|passcode|secret|token|password|otp)(_|$)/;

// column name -> [type, nullable, varchar length or null]
const TABLES = [
  {
    table: "home_automation_device",
    entity: HomeAutomationDevice,
    columns: {
      id: ["varchar", false, 255],
      integration_account_id: ["varchar", false, 255],
      provider_device_id: ["varchar", false, 255],
      property_id: ["varchar", false, 255],
      unit_id: ["varchar", true, 255],
      device_type: ["varchar", false, 50],
      name: ["varchar", true, 255],
      capabilities: ["text", true, null],
      status: ["varchar", false, 50],
      battery_level: ["int", true, null],
      last_seen_at: ["bigint", true, null],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
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
      id: ["varchar", false, 255],
      integration_account_id: ["varchar", false, 255],
      booking_id: ["varchar", false, 255],
      property_id: ["varchar", false, 255],
      device_id: ["varchar", false, 255],
      guest_id: ["varchar", true, 255],
      provider_credential_id: ["varchar", true, 255],
      credential_type: ["varchar", false, 50],
      status: ["varchar", false, 20],
      valid_from: ["bigint", false, null],
      valid_until: ["bigint", false, null],
      revoked_at: ["bigint", true, null],
      failure_reason: ["text", true, null],
      created_at: ["bigint", false, null],
      updated_at: ["bigint", false, null],
    },
    indexes: [
      ["UNIQUE ", "access_credential_booking_device_unique", "booking_id, device_id"],
      ["UNIQUE ", "access_credential_provider_credential_unique", "integration_account_id, provider_credential_id"],
    ],
  },
];

const loadMigrationSql = () => readMigrationSql(MIGRATION_FILE);

describe.each(TABLES)("$table", ({ table, entity, columns, indexes }) => {
  it("maps the columns, types, nullability and lengths that the migration declares", async () => {
    const metadata = await loadMetadata(entity);
    const mapped = Object.fromEntries(
      metadata.columns.map((c) => [c.databaseName, [c.type, c.isNullable, c.length ? Number(c.length) : null]])
    );
    expect(metadata.tableName).toBe(table);
    expect(mapped).toEqual(columns);
    expect(metadata.primaryColumns.map((c) => c.databaseName)).toEqual(["id"]);
  });

  it.each(["test", "main"])("declares the same columns in the %s schema of the migration SQL", (schema) => {
    expect(sqlColumns(loadMigrationSql(), `${schema}.${table}`).sort()).toEqual(Object.keys(columns).sort());
  });

  it.each(["test", "main"])(
    "declares the same types, nullability and lengths in the %s schema of the migration SQL",
    (schema) => {
      expect(sqlColumnDefinitions(loadMigrationSql(), `${schema}.${table}`)).toEqual(columns);
    }
  );

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

describe("migration SQL smoke tests", () => {
  // Word boundaries, because should_be_one is also the tail of the other two names.
  const UNIQUE_INDEX_CHECKS = ["should_be_one", "device_should_be_one", "provider_credential_should_be_one"].map(
    (name) => new RegExp(String.raw`\b${name}\b`)
  );

  it.each(["test", "main"])("checks every unique index in the %s schema", (schema) => {
    const block = smokeBlocks(loadMigrationSql()).find((candidate) => candidate.includes(`INTO ${schema}.`));
    UNIQUE_INDEX_CHECKS.forEach((check) => expect(block).toMatch(check));
  });

  // Whole-table counts would fail on the first real row, and the check exists to prove the ROLLBACK left nothing.
  it("counts only the smoke rows in the final check, and lists every id the smoke tests insert", () => {
    const sql = loadMigrationSql();
    const finalCheck = sql.slice(sql.lastIndexOf("ROLLBACK;"));
    const insertedIds = smokeBlocks(sql).flatMap((block) =>
      [...block.matchAll(/INSERT INTO \w+\.\w+ \([^)]*\)\s*VALUES \('([^']+)'/g)].map((match) => match[1])
    );

    expect(finalCheck.match(/count\(\*\)/g)).toHaveLength(4);
    expect(finalCheck.match(/WHERE id IN \(SELECT id FROM smoke_ids\)/g)).toHaveLength(4);
    expect(insertedIds.length).toBeGreaterThan(0);
    new Set(insertedIds).forEach((id) => expect(finalCheck).toContain(`('${id}')`));
  });
});

describe("migration SQL", () => {
  it("has no DDL inside a BEGIN block", () => {
    const blocks = [...loadMigrationSql().matchAll(/BEGIN;([\s\S]*?)ROLLBACK;/g)].map((match) => match[1]);
    expect(blocks).toHaveLength(2);
    blocks.forEach((block) => expect(block).not.toMatch(/\b(CREATE|ALTER|DROP)\b/));
  });
});
