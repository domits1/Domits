# Booking and invoice money precision deployment

## Purpose

The booking and invoice tables retain their existing major-unit fields for compatibility. New writes also persist exact integer minor units and the currency code. These additive nullable columns avoid in-place changes to existing Aurora DSQL column types.

## Deployment order

1. Review the code and SQL in this change.
2. Apply each ALTER TABLE statement below as its own autocommit statement. Do not wrap the DDL in a multi-statement transaction.
3. Verify the columns exist before deploying the ORM entities and Lambda code. The booking entity is selected by many Lambdas, so deploying code before the columns exist can break booking reads.
4. Deploy the application code.
5. Run the backfill and reconciliation scripts in dry-run mode, review their output, and only then decide whether to use --commit. The scripts are not invoked automatically.

## Booking table

Check for active DSQL jobs and existing columns first:

~~~sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

SELECT table_schema, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('total_price_minor', 'refund_requested_amount')
ORDER BY table_schema, column_name;
~~~

Apply these separately:

~~~sql
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;
~~~

Verify both schemas:

~~~sql
SELECT table_schema, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('total_price_minor', 'refund_requested_amount')
ORDER BY table_schema, column_name;
~~~

## Invoice table

The existing invoice migration creates main.invoice only. Check the table and apply each statement separately:

~~~sql
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS rate_per_night_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS gross_amount_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS commission_amount_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS net_amount_minor BIGINT;
~~~

Verify:

~~~sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'invoice'
  AND column_name IN ('currency', 'rate_per_night_minor', 'gross_amount_minor', 'commission_amount_minor', 'net_amount_minor')
ORDER BY column_name;
~~~

## Backfill and reconciliation scripts

All scripts are dry-run by default.

- node scripts/backfill-total-price-from-stripe.js considers only native direct EUR bookings with a Stripe PaymentIntent ID. It requires a succeeded PaymentIntent whose amount and amount_received are the same safe integer, and skips rows whose existing total_price does not match that amount. It uses PaymentIntent.amount to preserve the customer-facing total_price meaning. Use --limit N for a limited review.
- node scripts/backfill-booking-total-price-minor.js converts already-stored legacy Channex and standalone-site booking totals. Channex rows with a stored currency use it; pre-currency Channex rows with a stored amount use EUR because the old importer stored amounts only for EUR revisions. Rows with no stored amount/currency are skipped. Legacy amounts originated as floating-point values, so this cannot recover precision already lost in the source representation.
- node scripts/reconcile-booking-refunds-from-stripe.js verifies only bookings that have a real Stripe refund ID. It replaces the old amount/status with Stripe's confirmed amount/status when the refund is succeeded, failed or canceled. Pending and unrecognized statuses do not change the stored amount.

Only add --commit after the dry-run output has been reviewed. These scripts do not automatically run as part of deployment.

The scripts cannot infer a historical refund request for bookings without a Stripe refund ID. Legacy refunded_amount can contain policy-calculated request amounts even when no Stripe refund was confirmed. Those rows require manual reconciliation and must not be assumed to be actual refunds.

## Accounting boundaries

- total_price_minor is the customer-facing booking total in the booking currency. It is not owner net earnings.
- refunded_amount is updated as an actual amount only when Stripe confirms a successful refund (or as zero when Stripe confirms a failed/canceled refund). refund_requested_amount separately records the cancellation-policy amount requested.
- Historical refund rows without a Stripe refund ID are not automatically changed.
- New invoice rows store currency and exact minor-unit snapshots. The old numeric(10,2) fields remain for compatibility.
- The invoice generator's existing 10% calculation remains an invoice convention, not an approved owner-agreement commission source. Invoice creation currently refuses currencies with more than two fraction digits because its compatibility NUMERIC(10,2) columns cannot represent a third fractional digit without losing precision.
- No exchange rates, taxes, owner expense policy, or reporting-period attribution are introduced by this change.
