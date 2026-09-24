# Channex ARI outbox table (2026-09-24)

Runbook for the hand-applied migration under `backend/ORM/migrations/`:

- `20260924_create_channex_ari_outbox.{js,sql}`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here instead.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`).

## What the table is for

One row per ARI change ("this property changed, these dates, these types"), written in the same transaction as the domain change and drained by a worker in the `ChannelManagement` Lambda. The design is in [channex_ari_outbox_design.md](../apis/channelmanagement/channex_ari_outbox_design.md) (#3278).

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction, never DDL and DML in the same transaction. Run each statement on its own in psql autocommit mode; never wrap a block in `BEGIN`. The only `BEGIN` in the file is the smoke test, which contains DML only.
- Indexes are created with `CREATE INDEX ASYNC`. The statement returns immediately and the build runs in the background, so check `sys.jobs` until both jobs read `completed`. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit and every index activation bumps the cluster-wide catalog version. Sessions holding a stale catalog, including warm Lambdas, fail their next statement once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window, back to back.
- The table is new and empty, so there is no backfill and the 3,000-row transaction limit does not come into play here. It does apply to the worker's cleanup, which deletes at most 1,000 rows per run.
- `VARCHAR` widths are permanent: there is no `ALTER COLUMN ... TYPE`. `datefrom` and `dateto` are `INTEGER` in `YYYYMMDD` form, matching `calendar_date` in `property_calendar_override`; timestamps are `BIGINT` milliseconds, matching `booking_automation_outbox`.
- Limits checked: 15 columns (limit 255), 2 indexes plus the primary key (limit 24), single `VARCHAR(255)` index keys (limit 1 KiB).
- No `CHECK` constraints on `status`, `kind` or `source`. The values are enforced in code (`channexAriOutboxConstants.js`), and a column constraint cannot be altered later without recreating the table.

## Blocks in the file, in order

1. Pre-flight `SELECT` on `information_schema.tables`: expect no row, meaning the table does not exist yet.
2. Pre-flight on `sys.jobs`: no row for `main.%channex_ari_outbox%` with status `submitted` or `processing`. An in-flight job means someone else is applying this right now.
3. `CREATE TABLE IF NOT EXISTS main.channex_ari_outbox`.
4. Two `CREATE INDEX ASYNC IF NOT EXISTS` statements: `idx_channex_ari_outbox_ready` (status, domitspropertyid, createdat) and `idx_channex_ari_outbox_stale` (status, updatedat). `IF NOT EXISTS` makes the file re-runnable after an interrupted session.
5. Wait for the index jobs: re-run the `sys.jobs` query filtered on `main.idx_channex_ari_outbox%` until both rows read `completed`.
6. Verification: 15 columns with the expected types and nullability; both indexes present with `indisvalid = t` and the expected key columns, read through `pg_namespace` so a later `test` copy cannot be confused with the `main` one.
7. Smoke test: one `BEGIN ... INSERT ... SELECT ... ROLLBACK` block. The row must come back from the `SELECT` and leave nothing behind, which the `count(*)` after it confirms as zero.
8. Rollback: `DROP INDEX` twice, then `DROP TABLE`, all schema-qualified with `main.` so they cannot silently miss when `search_path` does not include it. Last in the file; do not paste the file top to bottom.

## Order of operations

1. Apply to `main` in a quiet window. Warm Lambdas may fail one statement with `40001` right after; that is expected and resolves on retry.
2. Apply to `test` only when integration tests against the real schema are added (design section 11). The same rules apply there, including the catalog bump.
3. The migration must be applied **before** the write sites start using the writer (rollout step 3 of the design). A missing table would fail the transactions of PropertyHandler, General-Bookings, UnifiedMessaging and ChannelManagement, and with them host saves and bookings.

## Status

Not applied yet. Update this section with the date and the person who applied it, as `dsql_booking_columns_runbook.md` does.
