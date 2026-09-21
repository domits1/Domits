# Booking table changes for direct booking websites (2026-09-04)

Runbook for the two hand-applied migrations under `backend/ORM/migrations/`:

- `20260904_booking_test_schema_reconcile.{js,sql}`
- `20260904_booking_direct_booking_website_columns.{js,sql}`

The `.js` files are the migration records (nothing in this repo executes them). The `.sql` files are the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here instead.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`).

## Aurora DSQL rules that shape these runbooks

- One DDL statement per transaction, never DDL and DML in the same transaction. Run each statement on its own in psql autocommit mode; never wrap a block in `BEGIN`.
- `ALTER TABLE ... ADD COLUMN` is a catalog change: no table rewrite, no lock. The `ADD COLUMN` grammar carries no constraints, and `SET NOT NULL` does not exist for existing tables, so every added column is nullable and stays nullable. `SET DEFAULT` applies to future writes only; existing rows keep NULL.
- There is no `ALTER COLUMN ... TYPE`. A varchar width is permanent unless the column is dropped and recreated, which is why all new columns are `VARCHAR(255)`.
- Uniqueness is `CREATE UNIQUE INDEX ASYNC`. It returns a `job_id` immediately and does not block the table. If a build fails, the index stays INVALID and still enforces uniqueness on writes until it is dropped. `NULLS DISTINCT` (the default) is required: every existing marketplace row has NULL in both indexed columns.
- Every DDL commit and every index activation bumps the cluster-wide catalog version. Sessions holding a stale catalog, including warm Lambdas, fail their next statement once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window, back to back. This applies to DDL on the `test` schema too.
- Limits checked: 24 active columns after this change (limit 255), 4 indexes on `booking` (limit 24), single `VARCHAR(255)` index keys (limit 1 KiB), no backfill (the 3,000-row transaction limit does not apply).
- `DROP COLUMN` does not reclaim space, and the dropped attribute still counts toward the table's 1,600-column lifetime limit.

## Part A: `20260904_booking_test_schema_reconcile.sql`

Status: applied to `test.booking` and verified on 2026-09-04.

Findings from the catalog read that motivated it:

- `main.booking` had 19 columns, `test.booking` had 15.
- `20260520_booking_refund_fields.js` records `refunded_amount`, `stripe_refund_id` and `refund_error` as added to both schemas; `test.booking` never received them.
- `total_price` had been on `main.booking` and in the entity since commit `96a91eb2f` (2026-05-28) with no migration record for either schema, and was missing from `test.booking`.
- No `column_default` existed on any of the four columns on `main.booking`, including `refunded_amount`, so the `DEFAULT 0` in the May migration was never applied there either. The reconcile therefore adds no defaults, and `schema.psql` no longer claims one.
- Until applied, every TypeORM read of the Booking entity with `TEST=true` failed with `column ... does not exist`, because the entity selects every mapped column.

Blocks in the file, in order:

1. Pre-flight `SELECT` on `information_schema.columns`: expect the four columns present on `main`, absent on `test`.
2. Four `ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS` statements.
3. Verification: both schemas report 19 columns; the `LEFT JOIN` query returns no rows; the four columns show `is_nullable = YES` on `test`.
4. Smoke test: a single `BEGIN ... INSERT ... SELECT ... ROLLBACK` block; the row must round-trip and leave nothing behind.
5. Rollback: four `DROP COLUMN IF EXISTS` statements. Last in the file; do not paste the file top to bottom.

## Part B: `20260904_booking_direct_booking_website_columns.sql`

Status: applied to both schemas and verified on 2026-09-04. Both tables have 24 columns and four valid unique indexes; existing bookings load correctly.

Column semantics: NULL in every new column means "marketplace booking, unchanged". `booking_source` carries `STANDALONE_SITE` for direct booking website requests (PR 5). `public_booking_ref` and `idempotency_key` are unique per schema.

Blocks in the file, in order:

1. Pre-flight: the five columns absent in both schemas; both schemas at 19 columns (Part A applied); no in-flight `sys.jobs` rows for `booking`.
2. `test` schema: five `ADD COLUMN IF NOT EXISTS`, then `CREATE UNIQUE INDEX ASYNC` on `public_booking_ref` and `idempotency_key` (names suffixed `_test`).
3. Wait for the `test` index jobs: re-run the `sys.jobs` query filtered on `test.booking_%_unique_test` until both rows read `completed`. `sys.jobs` forgets finished jobs after about 30 minutes.
4. `main` schema: the same five columns and two indexes.
5. Wait for the `main` index jobs the same way, filtered on `main.booking_%_unique`.
6. Verification: five rows per schema, all `is_nullable = YES`, no `column_default`; all four indexes `indisunique = t` and `indisvalid = t`; index definitions without `NULLS NOT DISTINCT`.
7. Smoke test 1: a `BEGIN ... ROLLBACK` block inserting one direct booking website row and one marketplace row with NULLs; both must round-trip.
8. Smoke test 2: a `BEGIN ... ROLLBACK` block whose second `INSERT` reuses an `idempotency_key`. The second `INSERT` must fail with a duplicate key error on the unique index; that failure is the passing result. `ROLLBACK` ends the aborted transaction.
9. Rollback: `DROP INDEX` then `DROP COLUMN IF EXISTS`, `main` first, then `test`. Last in the file; do not paste the file top to bottom.

## Order of operations for the whole change

1. Part A pre-flight, UP, verification, smoke test.
2. Part B pre-flight, `test` UP, wait, `main` UP, wait, verification, smoke tests.
3. Only then merge the pull request that changes `backend/ORM/models/Booking.js`. Any change under `backend/ORM/` redeploys every Lambda, and every Booking read selects the new columns from that moment on. `backend/test/ORM/bookingEntity.test.js` fails if the entity or `schema.psql` drift from the verified table.

## Deferred on purpose

- The three defaults `Booking.js` declares that the database does not have (`total_price`, `refunded_amount`, `bookingtype`). Tracked as a separate issue; the entity test carries a todo for it.
- `guestid` NOT NULL. DSQL cannot re-add NOT NULL, so relaxing it is a one-way decision left to PR 5.
- `confirmation_token_hash`, deferred with the public confirmation endpoint.
