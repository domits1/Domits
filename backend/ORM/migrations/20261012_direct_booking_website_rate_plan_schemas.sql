CREATE SCHEMA IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS test;

DO $migration$
DECLARE
  active_status CONSTANT VARCHAR(20) := 'ACTIVE';
BEGIN
  EXECUTE format($ddl$
    CREATE TABLE IF NOT EXISTS main.direct_booking_website_rate_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id VARCHAR(255) NOT NULL,
      plan VARCHAR(20) NOT NULL,
      price_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
      billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
      status VARCHAR(20) NOT NULL DEFAULT %L,
      effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      effective_until TIMESTAMP WITH TIME ZONE,
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT direct_booking_website_rate_plan_plan_check CHECK (plan IN ('essentials', 'elite')),
      CONSTRAINT direct_booking_website_rate_plan_price_check CHECK (price_cents >= 0)
    );
  $ddl$, active_status);
  EXECUTE $ddl$
    CREATE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_account_idx
      ON main.direct_booking_website_rate_plans (account_id, effective_from);
  $ddl$;
  EXECUTE format($ddl$
    CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_current_unique
      ON main.direct_booking_website_rate_plans (account_id)
      WHERE status IN (%L, 'PAST_DUE', 'TRIALING');
  $ddl$, active_status);
  EXECUTE $ddl$
    CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_subscription_unique
      ON main.direct_booking_website_rate_plans (stripe_subscription_id)
      WHERE stripe_subscription_id IS NOT NULL;
  $ddl$;

  EXECUTE format($ddl$
    CREATE TABLE IF NOT EXISTS test.direct_booking_website_rate_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id VARCHAR(255) NOT NULL,
      plan VARCHAR(20) NOT NULL,
      price_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
      billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
      status VARCHAR(20) NOT NULL DEFAULT %L,
      effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      effective_until TIMESTAMP WITH TIME ZONE,
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT direct_booking_website_rate_plan_plan_check_test CHECK (plan IN ('essentials', 'elite')),
      CONSTRAINT direct_booking_website_rate_plan_price_check_test CHECK (price_cents >= 0)
    );
  $ddl$, active_status);
  EXECUTE $ddl$
    CREATE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_account_idx_test
      ON test.direct_booking_website_rate_plans (account_id, effective_from);
  $ddl$;
  EXECUTE format($ddl$
    CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_current_unique_test
      ON test.direct_booking_website_rate_plans (account_id)
      WHERE status IN (%L, 'PAST_DUE', 'TRIALING');
  $ddl$, active_status);
  EXECUTE $ddl$
    CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_subscription_unique_test
      ON test.direct_booking_website_rate_plans (stripe_subscription_id)
      WHERE stripe_subscription_id IS NOT NULL;
  $ddl$;
END;
$migration$;
