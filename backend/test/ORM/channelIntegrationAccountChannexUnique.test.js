import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ChannelIntegrationAccountChannexUnique20261123 } from "../../ORM/migrations/20261123_channel_integration_account_channex_unique.js";

const read = (name) => readFileSync(path.join(process.cwd(), "ORM", "migrations", name), "utf8");
const MIGRATION = read("20261123_channel_integration_account_channex_unique.sql");
const ROLLBACK = read("20261123_channel_integration_account_channex_unique_rollback.sql");
const INDEX = "channel_integration_account_channex_user_unique";

// Design note D8 (#506): one Channex account row per host. Without this key, a new host's double click
// creates two account rows, each claims the listing, and two Channex properties are created.
describe("migration for one Channex account row per host", () => {
  it("makes userId unique among CHANNEX rows only, leaving the older BOOKING_COM rows alone", () => {
    expect(MIGRATION).toMatch(
      new RegExp(
        `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ${INDEX}\\s+ON main\\.channel_integration_account \\("userId", channel\\)\\s+WHERE channel = 'CHANNEX';`
      )
    );
  });

  it("checks for existing CHANNEX duplicates before building the index and deletes nothing", () => {
    expect(MIGRATION.indexOf("HAVING COUNT(*) > 1")).toBeLessThan(MIGRATION.indexOf("CREATE UNIQUE INDEX"));
    expect(MIGRATION).not.toMatch(/\b(DELETE|UPDATE)\b/i);
  });

  it("touches only the main schema", () => {
    expect(MIGRATION).not.toMatch(/\btest\./);
  });

  it("the record and the rollback name the same index", async () => {
    const statements = [];
    const queryRunner = { query: async (sql) => statements.push(sql) };
    const migration = new ChannelIntegrationAccountChannexUnique20261123();

    await migration.up(queryRunner);
    expect(statements.join("\n")).toContain(INDEX);

    statements.length = 0;
    await migration.down(queryRunner);
    expect(statements.join("\n")).toContain(`DROP INDEX IF EXISTS main.${INDEX}`);
    expect(ROLLBACK).toContain(`DROP INDEX IF EXISTS main.${INDEX};`);
  });
});
