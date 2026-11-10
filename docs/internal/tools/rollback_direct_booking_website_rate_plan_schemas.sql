-- Rollback for the Direct Booking Website rate-plan schema migration.
-- REVIEW BEFORE RUNNING:
--   * This rollback only removes objects in the test schema.
--   * Confirm the test table and indexes were introduced by this migration.
--   * Confirm no test data needs to be retained.
--   * Do NOT drop main.direct_booking_website_rate_plans; it may hold real host plans.
--   * Run only with an approved operator and after checking the migration runbook.

DROP INDEX IF EXISTS test.direct_booking_website_rate_plan_subscription_unique_test;
DROP INDEX IF EXISTS test.direct_booking_website_rate_plan_current_unique_test;
DROP INDEX IF EXISTS test.direct_booking_website_rate_plan_account_idx_test;
DROP TABLE IF EXISTS test.direct_booking_website_rate_plans;
