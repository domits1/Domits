# Claim a listing before provisioning: nullable Channex id and partial unique key (2026-11-23)

Runbook for the hand-applied migration `backend/ORM/migrations/20261123_channel_integration_property_claim.{js,sql}` (design note D2, #506).

The `.js` file is the migration record; nothing in the repo runs it. The `.sql` file holds the statements, without comments by convention, so the order and the expected results live here.

Connect as in [dsql_booking_columns_runbook.md](./dsql_booking_columns_runbook.md) (console → Aurora DSQL → cluster → Connect → CloudShell). The DSQL rules apply: one DDL statement per transaction in autocommit, never DDL inside `BEGIN`, never DDL and DML together, and every DDL commit bumps the catalog version, so warm Lambdas fail one statement with `40001` / `OC001` and succeed on retry. Run it in a quiet moment, one block at a time; do not paste the file top to bottom.

`main` only: the integration tables do not exist in the `test` schema (checked on 20 Nov).

## What changes

- `externalPropertyId` becomes nullable: the claim row (`PROVISIONING`) is written before Channex creates the property. `DROP NOT NULL` was tried on a scratch table on DSQL on 20 Nov.
- The older of two April test mappings of "test house" (`5f3fc6b0-…`, 16 Apr, disconnected account "Channex Test", inactive listing) becomes `ARCHIVED`. The 23 Apr row (`cfc7f383-…`) stays `ACTIVE`. Nothing is deleted: the room types, rate plans, booking revisions and sync evidence of that listing stay.
- A partial unique index: one in-use mapping per account and listing, `WHERE status IN ('PROVISIONING', 'ACTIVE', 'active')`. The lowercase value is a legacy row (one `active` row on 20 Nov). The list must equal `IN_USE_STATUSES` in `integrationPropertyRepository.js`; `test/ORM/channelIntegrationPropertyClaim.test.js` fails the build when they differ.

## Deploy order

1. Merge and deploy the pull request that adds this migration first. It brings the refuse rule in `integrationPropertyRepository.upsert` (a second in-use mapping gets 409) and the nullable entity column. A nullable entity on a column that is still `NOT NULL` changes nothing.
2. Only then run the blocks below.

The other order leaves a window in which the old `upsert`, without the refuse rule, can add a second in-use row: before the index build that row makes the build fail (`Found duplicate key`, an `INVALID` index), after it the save fails with a 500 instead of a 409.

## Blocks in the `.sql` file, in order

1. Pre-flight: account and listing pairs with more than one in-use row. On 20 Nov: exactly one, `aa021180-…` × `2d6e737c-…`. Any other pair: stop, and decide which row to archive before continuing.
2. Jobs on the table still `submitted` or `processing`: must be empty.
3. `ALTER TABLE … ALTER COLUMN "externalPropertyId" DROP NOT NULL` (DDL, alone).
4. Check: `is_nullable = YES` for `externalPropertyId`.
5. `UPDATE … SET status = 'ARCHIVED' WHERE id = '5f3fc6b0-…' AND status = 'ACTIVE'` (DML, alone): `UPDATE 1`. `UPDATE 0` means it was already archived; check block 6.
6. Pre-flight again: must return no rows now. Do not continue otherwise: the index build fails on duplicates (`Found duplicate key while validating index for UCVs`) and leaves an `INVALID` index, which still refuses writes until it is dropped.
7. `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_property_in_use_unique …` (DDL, alone). Note the returned `job_id`.
8. Poll `sys.jobs` until `completed`. `failed`: drop the index (rollback file, first statement), fix, and start again.
9. Catalog: one row with `indisunique = t`, `indisvalid = t`. Read the predicate: it must mean "status is PROVISIONING, ACTIVE or active" and nothing else; `pg_get_expr` may print it with casts or `= ANY (ARRAY[…])`, so do not compare it as text.
10. Smoke test 1 (`BEGIN … ROLLBACK`): two `PROVISIONING` claims for the same smoke account and listing. The second `INSERT` must fail with a duplicate key error; that failure is the pass. `ROLLBACK` ends the aborted transaction.
11. Smoke test 2 (`BEGIN … ROLLBACK`): an `ARCHIVED` row and an `ACTIVE` row for the same pair. Both insert and the `SELECT` shows two rows: archived rows are outside the rule, so a replaced mapping can sit next to the new one.

## Before the turn-on route ships

The key protects nothing until block 8 shows `completed` and block 9 `indisvalid = t`. Do not deploy the provisioning route (D2) before that.

## Rollback

`20261123_channel_integration_property_claim_rollback.sql`, in order: drop the index, then set the archived row back to `ACTIVE` (the other order would fail on the index). DSQL cannot `SET NOT NULL` on an existing table, so `externalPropertyId` stays nullable; that is harmless while no claim rows exist.

## Status

Not applied yet.
