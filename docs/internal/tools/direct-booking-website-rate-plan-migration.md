# Direct Booking Website rate-plan migration runbook

## Scope

Apply `backend/ORM/migrations/20261012_direct_booking_website_rate_plan_schemas.sql` in Aurora DSQL before deploying the Direct Booking Website rate-plan code. The SQL file creates/checks the `main` and `test` schemas, tables, and indexes in one run. Execute it against the Aurora DSQL cluster used by PropertyHandler; do not run separate variants that change the schema names.

The migration uses `IF NOT EXISTS` so it can be re-run, but that does not validate an index that already exists under the same name. Confirm the index definitions and validity below.

## Status

- **Status last checked:** 2026-10-19 (Europe/Amsterdam)
- **Database migration applied:** 2026-10-19 — Mounir Bekkaoui executed the checked-in migration's DDL statements individually through the Aurora DSQL Query Editor in cluster `domits` (`eu-west-2`). The statements were not submitted as one multi-statement script. Existing `main` objects were protected by `IF NOT EXISTS`; no main table was replaced.
- **`main` schema:** The rate-plan table and all three named rate-plan indexes plus the primary-key index were verified present. All four indexes reported `is_valid = true`. Re-running the index statements produced no new index jobs because the indexes already existed.
- **`test` schema:** Schema and table are present. All three asynchronous index jobs completed successfully on 2026-10-19: account index `ucpulmf7v5beln35xj74agfamy`, current-plan unique index `63g5nixfebaphligindil74ipy`, and subscription unique index `dtyh76hz35gqdi5av6i2ooicca`. The verification query showed all three named indexes and the primary-key index with `is_valid = true`.
- **Stripe Elite price check:** Verified in the Stripe Dashboard: price ID `price_1UOC5wGiInrsWMEcDideonLh`, `€43.00 EUR` recurring monthly. Lambda price ID matched. `DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS` has been set to `4300`; `DIRECT_BOOKING_WEBSITE_CHECKOUT_ENABLED` is set to `false`.
- **Webhook and environment alignment:** Pending. Confirm `STRIPE_WEBHOOK_SECRET` is configured without exposing its value. Also confirm with the deployment owner that using the live Stripe key with the acceptance success/cancel URLs and acceptance sites bucket is intentional before any checkout enablement.
- **Release readiness:** Database objects are present and valid, and the Stripe amount matches the configured cents. Keep checkout disabled until the webhook configuration and Stripe-mode/environment alignment are confirmed. Do not enable `DIRECT_BOOKING_WEBSITE_CHECKOUT_ENABLED=true` as part of this verification.

## Before you start

1. Open AWS CloudShell with the approved account/role and select the Aurora DSQL cluster used by PropertyHandler. Confirm the endpoint/database before running DDL.
2. Inspect `main.direct_booking_website_rate_plans` and its data first. This migration intentionally does not replace an existing main table.
3. Keep `DIRECT_BOOKING_WEBSITE_CHECKOUT_ENABLED=false` until the schema is verified and the Stripe webhook, price ID, amount, and return URLs are all confirmed. Do not paste secrets into a PR, log, or runbook.

## Apply the migration

1. Open `backend/ORM/migrations/20261012_direct_booking_website_rate_plan_schemas.sql` and execute its plain SQL statements against the intended Aurora DSQL cluster. The script targets both the `main` and `test` schemas.
2. The six `CREATE INDEX ASYNC` statements return asynchronous job IDs. Record those IDs and wait for each job to complete. Check the job state immediately after execution:
   ```sql
   SELECT job_id, status, details, object_name, start_time, update_time
   FROM sys.jobs
   ORDER BY start_time DESC;
   ```
   A job with status `failed` must be investigated; do not treat the migration as successful just because the DDL was accepted.
3. Verify the tables exist:
   ```sql
   SELECT schemaname, tablename
   FROM pg_tables
   WHERE schemaname IN ('main', 'test')
     AND tablename = 'direct_booking_website_rate_plans'
   ORDER BY schemaname;
   ```
   Expected: one row for `main` and one row for `test`.
4. Verify all three named rate-plan indexes per schema are valid:
   ```sql
   SELECT ns.nspname AS schema_name,
          tbl.relname AS table_name,
          idx.relname AS index_name,
          i.indisvalid AS is_valid,
          pg_get_indexdef(i.indexrelid) AS index_definition
   FROM pg_index AS i
   JOIN pg_class AS tbl ON tbl.oid = i.indrelid
   JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
   JOIN pg_class AS idx ON idx.oid = i.indexrelid
   WHERE ns.nspname IN ('main', 'test')
     AND tbl.relname = 'direct_booking_website_rate_plans'
   ORDER BY ns.nspname, idx.relname;
   ```
   Confirm the account, current-plan unique, and subscription unique indexes exist in each schema and `is_valid` is true. Include the primary-key index when reviewing output; it is expected too.
5. Record the successful completion date (include timezone), operator name, target cluster/environment, and verification result in the Status section above.

## Verify the Stripe Elite price

Do this against the **same Stripe mode** (live or test) used by the PropertyHandler deployment.

1. Read only the three non-secret Lambda settings; do not print or share the webhook secret or Stripe secret key:
   ```bash
   aws lambda get-function-configuration \
     --function-name PropertyHandler \
     --region eu-north-1 \
     --query 'Environment.Variables.{ElitePriceId:DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID,ElitePriceCents:DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS,CheckoutEnabled:DIRECT_BOOKING_WEBSITE_CHECKOUT_ENABLED}' \
     --output table
   ```
2. Open the exact `DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID` in the matching Stripe Dashboard mode. Confirm it is the intended recurring Elite price, in EUR, with the expected billing interval.
3. Compare Stripe's unit amount in minor units to `DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS` exactly. For example, a Stripe unit amount of €43.00 means `4300` cents. Do not infer the amount from the product name or a frontend label.
4. If the price ID or amount is absent, mismatched, or belongs to the wrong Stripe mode, leave checkout disabled and fix the Lambda configuration before enabling it. Never enable checkout just to test whether the values match.
5. Record the verified amount, currency, billing interval, price ID suffix (not any secret), mode, check date, and operator in this Status section. Keep credentials out of this document.

## Rollback

Use `docs/internal/tools/rollback_direct_booking_website_rate_plan_schemas.sql` only if rollback is approved and the `test` table/indexes were introduced by this migration. It drops only the test-schema objects. **Do not drop or recreate `main.direct_booking_website_rate_plans`**: it may contain real host plans. If a production rollback is needed, assess the main-schema indexes individually and obtain approval before changing them.
