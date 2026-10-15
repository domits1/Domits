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

  it("has a migration that creates the table and uniqueness indexes in both schemas", () => {
    const migration = loadMigrationSql(
      "20261012_direct_booking_website_rate_plan_schemas.js"
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS ${schema}.direct_booking_website_rate_plans");
    expect(migration).toContain("ON ${schema}.direct_booking_website_rate_plans (account_id)");
    expect(migration).toContain("ON ${schema}.direct_booking_website_rate_plans (stripe_subscription_id)");
    expect(migration).toContain("WHERE status IN ('ACTIVE', 'PAST_DUE', 'TRIALING')");
    expect(migration).toContain("WHERE stripe_subscription_id IS NOT NULL");
    expect(migration).toContain('for (const schema of ["main", "test"])');

    const down = migration.slice(migration.indexOf("async down(queryRunner)"));
    expect(down).toContain('const schema = "test"');
    expect(down).not.toContain("DROP TABLE IF EXISTS main.direct_booking_website_rate_plans");
    expect(down).not.toContain('for (const schema of ["test", "main"])');
  });
});
