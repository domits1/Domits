# One Channex account row per host: partial unique index (2026-11-23)

Runbook for the hand-applied migration `backend/ORM/migrations/20261123_channel_integration_account_channex_unique.{js,sql}` (design note D8, #506).

Same connection and DSQL rules as [dsql_channel_property_claim_runbook.md](./dsql_channel_property_claim_runbook.md): one DDL statement per transaction, no `BEGIN` around DDL, a quiet moment, one block at a time. `main` only.

## Why

Provisioning creates a host's Channex account row on the first turn-on. Without this key, a new host's double click creates two rows, each request claims the listing under its own row (the claim key is per account and listing), and Channex gets two properties. With the key, the loser of the account insert gets `23505` or `40001`, reads the winner's row, and both claims meet on one account.

Only `channel = 'CHANNEX'`: on 23 Nov one user had three older `BOOKING_COM` rows, which this key leaves alone.

## Deploy order

1. Merge and deploy the pull request first: it brings the code that handles a lost account insert.
2. Then run the blocks below. Do this before the provisioning route is used.

## Blocks in the `.sql` file, in order

1. Pre-flight: users with more than one `CHANNEX` row. Must return no rows (23 Nov: none). If rows come back, stop and decide which row stays before continuing.
2. Jobs on the table still `submitted` or `processing`: must be empty.
3. `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_account_channex_user_unique …` (DDL, alone). Note the `job_id`.
4. Poll `sys.jobs` until `completed`. `failed`: drop the index (rollback file) and start over.
5. Catalog: one row with `indisunique = t`, `indisvalid = t`; the predicate must mean "channel is CHANNEX" and nothing else.
6. Smoke test (`BEGIN … ROLLBACK`): two `CHANNEX` rows for one smoke user. The second `INSERT` must fail with a duplicate key error; that is the pass.

## Rollback

`20261123_channel_integration_account_channex_unique_rollback.sql`: drop the index.

## Status

Not applied yet.
