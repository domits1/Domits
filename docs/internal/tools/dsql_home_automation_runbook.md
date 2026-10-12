# Home automation tables (2026-10-08)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3389, RemoteLock):

- `20261008_create_home_automation.{js,sql}` and `20261008_create_home_automation_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` files hold the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md). The runtime connects as the `admin` database user (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same role.

## What the tables are for

- `home_automation_device`: one row per device (for example a smart lock) that a provider account reports for a property. Unique per `(integration_account_id, provider_device_id)`.
- `access_credential`: one row per booking and device, linking a guest's access to the provider's credential. Unique per `(booking_id, device_id)`, so a retry cannot create a second credential; re-issuing updates the same row. Also unique per `(integration_account_id, provider_credential_id)`.

The connection itself is a `channel_integration_account` row with `channel = 'REMOTELOCK'`; there is no account table here.

**No PIN, code or secret is stored.** `access_credential` keeps only `provider_credential_id`. `failure_reason` holds the reason for a failure and must never contain a code or secret. `backend/test/ORM/homeAutomationEntities.test.js` fails if a column named like a secret appears.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own (autocommit); never wrap a block in `BEGIN`. The only `BEGIN` blocks are the smoke tests, which contain DML only.
- Indexes are `CREATE [UNIQUE] INDEX ASYNC`. Check `sys.jobs` until each job reads `completed` before the smoke tests: without the unique index, the target-less `ON CONFLICT DO NOTHING` silently inserts both rows, so `should_be_one` would read 2. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit bumps the catalog version, so warm sessions can fail once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window. This applies to `test` too.
- No foreign keys and no `CHECK` constraints. A column type cannot be altered later (`id` and `*_id` are `VARCHAR(255)`).
- Index names carry a `_test` suffix on the `test` schema.

## Blocks in the file, in order

1. Pre-flight on `information_schema.tables`: expect no row. If a table already exists, `CREATE TABLE IF NOT EXISTS` skips it silently, so compare its columns with the verification query before going on. Only an empty, mismatching table may be dropped and recreated, with the owners' sign-off.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job for these tables.
3. `test` schema: both tables and four indexes, then wait for its index jobs.
4. `main` schema: the same, then wait for its index jobs.
5. Verification: column types and nullability, and the four indexes per schema with `indisunique` and `indisvalid = t`.
6. Smoke tests, one `BEGIN ... ROLLBACK` block per schema: the second insert for the same booking and device must be ignored (`should_be_one`), `default_status` must read `PENDING`, and a third credential for another booking with no `provider_credential_id` must be kept, so `should_be_two` counts both rows of the account that have a NULL provider id (this shows pending rows can coexist under the unique index on `(integration_account_id, provider_credential_id)`). The final `count(*)` query must return zeros.
7. Rollback is a separate file, `main` first, then `test`. Do not run it as part of the apply. Only roll back while `access_credential` is empty, or after revoking every credential at the provider, because dropping it loses the only link to live codes.

## Order of operations

1. Pre-flight, `test` UP, wait for its jobs, `main` UP, wait for its jobs.
2. Verification, then the smoke tests.
3. Only then deploy code that reads or writes the tables. Any change under `backend/ORM/` redeploys every Lambda.

The entities are registered in `backend/ORM/util/database/Tables.js`. They are not registered in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`; the first Lambda that reads them through that package must add them there.

## Status

Not applied. Nothing has been run against any schema.
