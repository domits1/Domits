import { describe, expect, it } from "@jest/globals";
import {
  extractCreateTableColumns,
  loadMigrationSql,
  loadSchemaSql,
} from "./schemaSql.js";

const RATE_PLAN_COLUMNS = [
  "id",
  "account_id",
  "plan",
  "price_cents",
  "currency",
  "billing_frequency",
  "status",
  "effective_from",
  "effective_until",
  "stripe_customer_id",
  "stripe_subscription_id",
  "created_at",
  "updated_at",
];

describe("Direct Booking Website rate-plan schema", () => {
  it.each(["main", "test"])("defines the complete rate-plan table in %s", (schemaName) => {
    const schema = loadSchemaSql();
    const columns = extractCreateTableColumns(
      schema,
      `${schemaName}.direct_booking_website_rate_plans`
    );

    for (const column of RATE_PLAN_COLUMNS) {
      expect(columns).toContain(column);
    }
  });

  it("keeps the hand-run SQL migration as plain DDL statements for Aurora DSQL", () => {
    const migration = loadMigrationSql(
      "20261012_direct_booking_website_rate_plan_schemas.sql"
    );
    const statements = migration.split(";").map((statement) => statement.trim()).filter(Boolean);

    expect(migration).not.toMatch(/^\s*DO\b/im);
    expect(migration).not.toMatch(/\b(?:DECLARE|EXECUTE|BEGIN)\b/i);
    expect(statements).toHaveLength(10);
    expect(statements.every((statement) => /^CREATE\b/i.test(statement))).toBe(true);
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS main.direct_booking_website_rate_plans");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS test.direct_booking_website_rate_plans");
    expect(migration).toContain("CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_current_unique_test");
  });

  it("has a migration that creates the table and uniqueness indexes in both schemas", () => {
    const migration = loadMigrationSql(
      "20261012_direct_booking_website_rate_plan_schemas.js"
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS ${schema}.direct_booking_website_rate_plans");
    expect(migration).toContain("ON ${schema}.direct_booking_website_rate_plans (account_id)");
    expect(migration).toContain("ON ${schema}.direct_booking_website_rate_plans (stripe_subscription_id)");
    expect(migration).toContain(`const ACTIVE_STATUS_SQL = "'ACTIVE'";`);
    expect(migration).toContain(
      `const CURRENT_PLAN_STATUSES_SQL = [ACTIVE_STATUS_SQL, "'PAST_DUE'", "'TRIALING'"].join(", ");`
    );
    expect(migration).toContain("status VARCHAR(20) NOT NULL DEFAULT ${ACTIVE_STATUS_SQL},");
    expect(migration).toContain("WHERE status IN (${CURRENT_PLAN_STATUSES_SQL});");
    expect(migration).toContain("WHERE stripe_subscription_id IS NOT NULL");
    expect(migration).toContain("const createSchemaObjects = async (schema, suffix) => {");
    expect(migration).toContain('await createSchemaObjects("main", "");');
    expect(migration).toContain('await createSchemaObjects("test", "_test");');
    expect(migration).not.toContain('for (const schema of ["main", "test"])');

    const down = migration.slice(migration.indexOf("async down(queryRunner)"));
    expect(down).toContain('const schema = "test"');
    expect(down).not.toContain("DROP TABLE IF EXISTS main.direct_booking_website_rate_plans");
    expect(down).not.toContain('for (const schema of ["test", "main"])');
  });
});
