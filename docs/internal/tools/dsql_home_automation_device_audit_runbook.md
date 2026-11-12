# Home automation device audit table (2026-10-23)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3389, RemoteLock device mapping):

- `20261023_create_home_automation_device_audit.{js,sql}` and `20261023_create_home_automation_device_audit_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` files hold the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md). The runtime connects as the `admin` database user (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same role.

## What the table is for

`home_automation_device_audit` records every change to a host's device-to-property mapping (acceptance criterion of #3389: "mapping changes are audited"). One row per change:

- `MAPPED`: a device was linked to a property. `old_property_id` is NULL.
- `REMAPPED`: a mapped device was moved to another property. Both property ids are set.
- `UNMAPPED`: the link was removed. `new_property_id` is NULL.

`user_id` is the Cognito `sub` of the host who made the change, `created_at` is epoch milliseconds. The table is **append-only**: the schema cannot enforce that, so the repository that writes it only ever inserts, and the mapping change and its audit row are written in one transaction. `action` is checked in code, not by the database, because DSQL has no `CHECK` constraint.

**Only ids are stored.** No device name, no token, no PIN. `backend/test/ORM/homeAutomationDeviceAudit.test.js` fails if a column named like a name or a secret appears.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own (autocommit); never wrap a block in `BEGIN`. The only `BEGIN` blocks are the smoke tests, which contain DML only.
- The index is `CREATE INDEX ASYNC`. Check `sys.jobs` until its job reads `completed` before the verification. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit bumps the catalog version, so warm sessions can fail once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window. This applies to `test` too.
- No foreign keys and no `CHECK` constraints. A column type cannot be altered later (`id` and `*_id` are `VARCHAR(255)`).
- The index name carries a `_test` suffix on the `test` schema.

## The index

`home_automation_device_audit_account_created_idx` on `(integration_account_id, created_at)` serves the one read the feature needs: a host's mapping history, newest first. It is not unique, because an audit row must never be rejected; the primary key on `id` already stops a duplicate insert. There is deliberately no per-device index.

## Blocks in the file, in order

1. Pre-flight on `information_schema.tables`: expect no row. If the table already exists, `CREATE TABLE IF NOT EXISTS` skips it silently, so compare its columns with the verification query before going on. Only an empty, mismatching table may be dropped and recreated, with the owners' sign-off.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job for this table.
3. `test` schema: the table and its index, then wait for the index job.
4. `main` schema: the same, then wait for its index job.
5. Verification: column types and nullability, and the index per schema with `indisunique = f` and `indisvalid = t`.
6. Smoke tests, one `BEGIN ... ROLLBACK` block per schema. Expected results:
   - `same_account_device_rows_should_be_four`: `4`. Repeated changes for the same account and device are kept, which shows no unique index sneaked in.
   - `duplicate_id_rows_should_be_one`: `1`. A second insert with an existing id is ignored.
   - `mapped_without_old_property_should_be_two`: `2`. A `MAPPED` row keeps a NULL `old_property_id`.
   - `unmapped_without_new_property_should_be_one`: `1`. An `UNMAPPED` row keeps a NULL `new_property_id`.
7. The final query counts only the smoke rows, by the ids in its `smoke_ids` list, and must return zeros. It keeps working once real rows exist.
8. Rollback is a separate file, `main` first, then `test`. Do not run it as part of the apply. Dropping the table loses the audit history.

## Order of operations

1. Pre-flight, `test` UP, wait for its job, `main` UP, wait for its job.
2. Verification, then the smoke tests.
3. Only then deploy code that writes the table. Any change under `backend/ORM/` redeploys every Lambda.

The entity is registered in `backend/ORM/util/database/Tables.js` and in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`, the list the home automation handler loads.

## Status

**Not applied** on `test` or `main`.
