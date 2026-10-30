# Booking cancelled_at column (2026-10-30)

Runbook for the hand-applied migration under `backend/ORM/migrations/`:

- `20261030_booking_cancelled_at.{js,sql}`
- `20261030_booking_cancelled_at_rollback.sql`

Design: [booking_cancelled_at_design.md](../data/booking_cancelled_at_design.md). Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md), as Admin. The cluster is in eu-west-2.

## Apply it to both schemas before the pull request merges

`backend/ORM/models/Booking.js` maps `cancelled_at`, and TypeORM selects every mapped column on every read of the entity. Without the column, every booking read fails with `column "cancelled_at" does not exist` (`42703`). A change under `backend/ORM/` redeploys every Lambda, so merging puts this live everywhere at once.

## Steps

Run the statements of the `.sql` file one at a time, without `BEGIN`.

1. Column check: expect no rows. Stop if the column already exists.
2. `sys.jobs` check: expect no running job.
3. `ALTER TABLE test.booking`, then `ALTER TABLE main.booking`, back to back in a quiet moment. Each one makes warm Lambdas fail their next statement once with `40001` / `OC001`; a retry succeeds.
4. Column check: expect two rows, `bigint`, `is_nullable` `YES`, no default.
5. Run both `SELECT cancelled_at` statements: both must run without an error.
6. Merge the pull request and wait for the deploy.
7. Fill in the Status section below.

The column is empty for existing bookings: there is no backfill, because the real cancel moment of an old booking is unknown.

## Rollback

Aurora DSQL supports `DROP COLUMN` ([docs](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html)), but the safest rollback is to revert the model commit, let it deploy, and leave the empty column: it does no harm.

Only drop the column with the `_rollback.sql` file after that revert is deployed. Dropping it earlier breaks every booking read, and dropping it loses the stored dates. A dropped column keeps counting toward the table's limit of 1,600 columns over its lifetime.

## Status

Applied on 2026-10-30 to the `test` schema first, then `main`, and verified.
