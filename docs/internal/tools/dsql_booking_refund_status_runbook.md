# Booking refund status migration (#3834, Part 2)

Add the nullable `refund_status` column to both Aurora DSQL booking schemas.

## Required before merge and deployment

**Apply this migration before merging PR #3844.** The TypeORM `Booking` entity selects every mapped Booking column. If the code is deployed while `refund_status` is missing from either schema, booking reads on the affected environment can fail.

The Direct Booking annual commission work in PR #3839 adds five more columns to the same `Booking` entity. If both changes are included in a deployment, apply both migrations before deploying the combined entity:

- Refund status: `20261110_booking_refund_status.sql` (this PR).
- Commission tiers: `20261110_direct_booking_commission.sql`, following `dsql_direct_booking_commission_runbook.md`.

These migrations add different nullable columns. Neither replaces the other. The final merged `Booking.js` and `schema.psql` must retain all six fields.

## Apply on Aurora DSQL

Connect to the target Aurora DSQL cluster as Admin.

**Run every statement below as a separate query, in order. Do not submit the entire SQL file as a multi-statement batch and do not wrap the statements in a transaction.** Wait for each schema-change job to finish before continuing.

1. Check whether the column already exists:

```sql
SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'refund_status'
ORDER BY table_schema ASC;
```

2. Check for active schema jobs:

```sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');
```

3. Add the column to the test schema:

```sql
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
```

4. Add the column to the main schema:

```sql
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
```

5. Count the test-schema rows that the backfill will update:

```sql
SELECT COUNT(*) AS rows_to_backfill
FROM test.booking
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (NULLIF(TRIM(paymentid), '') IS NOT NULL AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );
```

Review the count before running the matching UPDATE. Aurora DSQL allows at most 3,000 rows to be affected in one transaction. If the count exceeds 3,000, do not run the full UPDATE as one statement; split the backfill into separate transactions that each affect no more than 3,000 rows.

6. Backfill historical cancelled bookings in the test schema:

```sql
UPDATE test.booking
SET refund_status = 'unknown'
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (NULLIF(TRIM(paymentid), '') IS NOT NULL AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );
```

7. Count the main-schema rows that the backfill will update:

```sql
SELECT COUNT(*) AS rows_to_backfill
FROM main.booking
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (NULLIF(TRIM(paymentid), '') IS NOT NULL AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );
```

Review the count before running the matching UPDATE. Aurora DSQL allows at most 3,000 rows to be affected in one transaction. If the count exceeds 3,000, do not run the full UPDATE as one statement; split the backfill into separate transactions that each affect no more than 3,000 rows.

8. Backfill historical cancelled bookings in the main schema:

```sql
UPDATE main.booking
SET refund_status = 'unknown'
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (NULLIF(TRIM(paymentid), '') IS NOT NULL AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );
```

9. Verify that both nullable columns exist:

```sql
SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'refund_status'
ORDER BY table_schema ASC;
```

10. Check that no migration job remains submitted or processing:

```sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');
```

Only after the migration has completed and both schemas verify correctly may PR #3844 be merged and the updated Booking entity and booking Lambda be deployed.

Historical cancelled bookings with payment/refund evidence are backfilled to `unknown`, because their outcome predates persisted Stripe refund statuses. The migration deliberately does not infer a successful refund from `refunded_amount` or `stripe_refund_id`.

## Status values

- `refunded`: Stripe refund status is `succeeded`.
- `not_refunded`: Stripe refund status is `failed`/`canceled`, or a paid booking had a zero policy refund.
- `unknown`: refund is pending, could not be verified, or is historical. Pending refunds remain unknown until the separate refund webhook/reconciliation follow-up in #2655 updates their stored status.

## Rollback

Roll back the application code and deploy it before running `20261110_booking_refund_status_rollback.sql`. Drop the column only after no deployed Booking entity selects it. Do not roll back the separate commission columns as part of this migration.
