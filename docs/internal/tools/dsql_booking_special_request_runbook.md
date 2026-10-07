# Booking special request column (2026-10-07)

Runbook for the hand-applied migration under `backend/ORM/migrations/`:

- `20260924_booking_special_request.{js,sql}`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here instead.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, as Admin, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`). The runtime connects as the `admin` database user with a `DbConnectAdmin` token (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same admin role.

## What the column is for

`booking.special_request` holds the free-text request a guest leaves for the host on their reservation page ("late check-in around 9pm"). The guest writes it through `PATCH` with `action: "update-special-request"` (`reservationController.handleUpdateSpecialRequestAction` → `bookingService.updateSpecialRequest` → `reservationRepository.updateBookingSpecialRequest`), limited to 500 characters and to the guest who owns the booking. The reservation page reads it back from the booking.

## Apply it to BOTH schemas BEFORE this PR deploys

The migration must exist in `test` **and** `main` before the code that maps the column reaches either environment.

- `backend/ORM/models/Booking.js` now maps `special_request`, and TypeORM selects every mapped column on every read of the entity. In a schema without the column, **every** booking read fails with `column "special_request" does not exist` (SQLSTATE `42703`) - creating, listing, cancelling and viewing bookings, not just the special request endpoint. `dsql_booking_columns_runbook.md` records the same failure for the earlier booking columns.
- `updateBookingSpecialRequest` no longer has a fallback for the missing column (removed in `3200aa065`), so the endpoint itself returns an error until the column exists.
- Any change under `backend/ORM/` redeploys every Lambda, so merging this PR deploys it everywhere at once. Do not merge until both schemas are done and verified.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction, never DDL and DML in the same transaction. Run each statement on its own in psql autocommit mode (or one query at a time in the Query Editor); never wrap a block in `BEGIN`. The only `BEGIN` blocks in the file are the smoke tests, which contain DML only.
- `ALTER TABLE ... ADD COLUMN` is a catalog change: no table rewrite, no lock, no backfill, so the 3,000-row transaction limit does not apply. The grammar carries no constraints, so the column is nullable and stays nullable, and existing bookings keep `NULL`. That is what the entity declares (`nullable: true`) and what the code expects: a booking with no request reads as empty.
- `TEXT` is deliberate: the 500 character limit is enforced in `bookingService.updateSpecialRequest`, and a column width cannot be changed later (no `ALTER COLUMN ... TYPE`).
- No `CHECK` constraint and no index: the column is never filtered or sorted on, only read with the booking row.
- Every DDL commit bumps the cluster-wide catalog version. Sessions holding a stale catalog, including warm Lambdas, fail their next statement once with SQLSTATE `40001` / `OC001` and succeed on retry. Run both `ALTER` statements back to back in one quiet window. This applies to the `test` schema too.
- `DROP COLUMN` does not reclaim space, and the dropped attribute still counts toward the table's 1,600-column lifetime limit.

## Blocks in the file, in order

1. Pre-flight `SELECT` on `information_schema.columns`: expect no row for `special_request` in either schema.
2. Pre-flight column counts: expect 24 columns on `booking` in each schema (the direct booking website columns are already in place; see `dsql_booking_columns_runbook.md`).
3. Pre-flight on `sys.jobs`: no `booking` job with status `submitted` or `processing`.
4. `ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS special_request TEXT`.
5. `ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS special_request TEXT`.
6. Verification: one row per schema, `data_type = text`, `is_nullable = YES`, no `column_default`; then both schemas at 25 columns.
7. Smoke test on `test`, then on `main`: one `BEGIN ... ROLLBACK` block each. It inserts one booking with a request and one without, updates the second one the way `updateBookingSpecialRequest` does, and selects both. The `SELECT` must show the text on both rows (the second after the `UPDATE`) and nothing may be left behind.
8. `count(*)` of the `smoke-sr-%` ids in both schemas: must be zero.
9. Rollback: `DROP COLUMN IF EXISTS`, `main` first, then `test`. Last in the file; do not paste the file top to bottom.

## Exact steps

1. Confirm the cluster from SSM, then connect as Admin through CloudShell or the Query Editor.
2. Run blocks 1 to 3. Stop if `special_request` already exists in either schema, if a schema is not at 24 columns, or if a `booking` job is in flight.
3. Run block 4 (`test`), then block 5 (`main`), each on its own, back to back.
4. Run block 6. Expect two rows (`main`, `test`), both `text`, `YES`, no default, and 25 columns in each schema.
5. Run the two smoke tests in block 7, one statement at a time, ending each with its `ROLLBACK`. Then run block 8 and confirm both counts are zero.
6. Only now merge the PR. If a warm Lambda reports `40001` right after, retry; that is expected.
7. Update the Status section below with the date and who applied it.

Rolling back the column (block 9) is only safe **after** this PR's code has been rolled back or never deployed: with the entity still mapping `special_request`, dropping the column breaks every booking read.

## Status

Not applied yet. Update this section with the date and the person who applied it, as `dsql_booking_columns_runbook.md` does.
