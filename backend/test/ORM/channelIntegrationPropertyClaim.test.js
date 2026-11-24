import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";
import { IN_USE_STATUSES } from "../../functions/.shared/integrations/repositories/integrationPropertyRepository.js";
import { ChannelIntegrationPropertyClaim20261123 } from "../../ORM/migrations/20261123_channel_integration_property_claim.js";

const read = (name) => readFileSync(path.join(process.cwd(), "ORM", "migrations", name), "utf8");
const MIGRATION = read("20261123_channel_integration_property_claim.sql");
const ROLLBACK = read("20261123_channel_integration_property_claim_rollback.sql");

// The older of the two April test mappings of "test house" (16 Apr); the 23 Apr one stays ACTIVE.
const OLDER_DUPLICATE_ID = "5f3fc6b0-da85-4ffb-b331-b74c24460099";
const INDEX = "channel_integration_property_in_use_unique";

const indexStatement = (sql) =>
  new RegExp(`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ${INDEX}\\s+ON main\\.channel_integration_property \\(([^)]+)\\)\\s+WHERE status IN \\(([^)]+)\\);`).exec(sql);

// Design note D2 (#506): one in-use mapping per account and listing, claimed before Channex is called.
describe("migration for claiming a listing before provisioning", () => {
  it("lets a claim row exist before Channex has created the property", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: [ChannelIntegrationProperty] });
    await dataSource.buildMetadatas();
    const column = dataSource.entityMetadatas[0].findColumnWithPropertyName("externalPropertyId");

    expect(column.isNullable).toBe(true);
    expect(MIGRATION).toContain(
      'ALTER TABLE main.channel_integration_property ALTER COLUMN "externalPropertyId" DROP NOT NULL;'
    );
  });

  it("archives only the older April duplicate and deletes nothing", () => {
    expect(MIGRATION).toContain(
      `UPDATE main.channel_integration_property SET status = 'ARCHIVED' WHERE id = '${OLDER_DUPLICATE_ID}' AND status = 'ACTIVE';`
    );
    expect(MIGRATION).not.toMatch(/\bDELETE\b/i);
  });

  it("makes account plus listing unique for the statuses the repository treats as in use", () => {
    const [, columns, statuses] = indexStatement(MIGRATION);

    expect(columns).toBe('"integrationAccountId", "domitsPropertyId"');
    // Fitness check: the index and the refuse rule in integrationPropertyRepository must not drift apart.
    expect(statuses.split(",").map((value) => value.trim().replaceAll("'", ""))).toEqual(IN_USE_STATUSES);
  });

  // The integration tables exist only in main (checked on DSQL, 20 Nov).
  it("touches only the main schema", () => {
    expect(MIGRATION).not.toMatch(/\btest\./);
  });

  it("the record and the rollback name the same index", async () => {
    const statements = [];
    const queryRunner = { query: async (sql) => statements.push(sql) };
    const migration = new ChannelIntegrationPropertyClaim20261123();

    await migration.up(queryRunner);
    expect(statements.join("\n")).toContain(INDEX);

    statements.length = 0;
    await migration.down(queryRunner);
    expect(statements.join("\n")).toContain(`DROP INDEX IF EXISTS main.${INDEX}`);
    expect(ROLLBACK).toContain(`DROP INDEX IF EXISTS main.${INDEX};`);
  });
});
