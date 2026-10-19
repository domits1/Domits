const ACTIVE_STATUS_SQL = "'ACTIVE'";
const CURRENT_PLAN_STATUS_PREDICATE_SQL = `status = ${ACTIVE_STATUS_SQL} OR status = 'PAST_DUE' OR status = 'TRIALING'`;

export class DirectBookingWebsiteRatePlanSchemas20261012 {
  async up(queryRunner) {
    await queryRunner.query("CREATE SCHEMA IF NOT EXISTS main;");
    await queryRunner.query("CREATE SCHEMA IF NOT EXISTS test;");

    const createTable = (schema, suffix) => `
      CREATE TABLE IF NOT EXISTS ${schema}.direct_booking_website_rate_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id VARCHAR(255) NOT NULL,
        plan VARCHAR(20) NOT NULL,
        price_cents INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
        status VARCHAR(20) NOT NULL DEFAULT ${ACTIVE_STATUS_SQL},
        effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        effective_until TIMESTAMP WITH TIME ZONE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT direct_booking_website_rate_plan_plan_check${suffix}
          CHECK (plan IN ('essentials', 'elite')),
        CONSTRAINT direct_booking_website_rate_plan_price_check${suffix}
          CHECK (price_cents >= 0)
      );
    `;

    const createSchemaObjects = async (schema, suffix) => {
      await queryRunner.query(createTable(schema, suffix));
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_account_idx${suffix}
        ON ${schema}.direct_booking_website_rate_plans (account_id, effective_from);
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_current_unique${suffix}
        ON ${schema}.direct_booking_website_rate_plans (account_id)
        WHERE ${CURRENT_PLAN_STATUS_PREDICATE_SQL};
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_subscription_unique${suffix}
        ON ${schema}.direct_booking_website_rate_plans (stripe_subscription_id)
        WHERE stripe_subscription_id IS NOT NULL;
      `);
    };

    await createSchemaObjects("main", "");
    await createSchemaObjects("test", "_test");
  }

  async down(queryRunner) {
    const schema = "test";
    const suffix = "_test";
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.direct_booking_website_rate_plan_subscription_unique${suffix};`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.direct_booking_website_rate_plan_current_unique${suffix};`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.direct_booking_website_rate_plan_account_idx${suffix};`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.direct_booking_website_rate_plans;`);
  }
}
