# Home automation credential lease table (2026-10-14)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3389, RemoteLock token provider):

- `20261014_create_home_automation_credential_lease.{js,sql}` and `20261014_create_home_automation_credential_lease_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` files hold the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md). The runtime connects as the `admin` database user (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same role.

## What the table is for

`home_automation_credential_lease` holds at most one row per integration account. A caller takes the lease before it refreshes an OAuth token, so two Lambdas never refresh the same account at once: RemoteLock rotates the refresh token on every refresh, and a second refresh with the old token can cost the host their connection. The table is provider-neutral and does not touch `integration_sync_state`.

`lease_expires_at` is epoch milliseconds from the **database clock** (`now()`), never from a Lambda, so clock skew between Lambdas does not matter. `CredentialLeaseRepository` caps a lease at `MAX_LEASE_TTL_MS` (60 s) and throws above it. A run that died frees its lease by expiring; a normal release sets it to 0 and keeps the row, so later acquires always update an existing row. **No token or secret is stored here.** The tokens stay in Secrets Manager.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own (autocommit); never wrap a block in `BEGIN`. The only `BEGIN` blocks are the smoke tests, which contain DML only.
- The account id is an inline `PRIMARY KEY`, so there is no `CREATE INDEX ASYNC` and no `sys.jobs` to wait for. The upsert's `ON CONFLICT (integration_account_id)` works as soon as the table exists.
- Every DDL commit bumps the catalog version, so warm sessions can fail once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window. This applies to `test` too.
- No foreign keys and no `CHECK` constraints. A column type cannot be altered later (`integration_account_id` and `owner_id` are `VARCHAR(255)`).
- Two simultaneous acquires for the same account do not queue: the loser fails at commit with `40001`, or sees no row. `CredentialLeaseRepository` treats both as "not acquired".

## Blocks in the file, in order

1. Pre-flight on `information_schema.tables`: expect no row. If the table already exists, `CREATE TABLE IF NOT EXISTS` skips it silently, so compare its columns with the verification query before going on. Only an empty, mismatching table may be dropped and recreated, with the owners' sign-off.
2. `test` schema: the table.
3. `main` schema: the table.
4. Verification: column types and nullability, and one valid unique primary-key index per schema.
5. Smoke tests. **Step 0 comes first** and is a single query: `step_0_database_epoch_ms_should_be_current` must return a plausible current epoch in milliseconds (13 digits). The repository code assumes DSQL accepts `floor(EXTRACT(EPOCH FROM now()) * 1000)::bigint` and the `INSERT ... SELECT ... ON CONFLICT` form. If Step 0 or the first acquire is rejected, stop and change the repository SQL before anything else. Then one `BEGIN ... ROLLBACK` block per schema, one account and two owners (A and B). `now()` does not advance inside a transaction, so expiry cannot be waited for: the block forces it with `UPDATE ... SET lease_expires_at = 0`. Expected results, in order:
   - `free_acquire_owner_should_be_a`: one row, owner A.
   - `held_acquire_should_return_no_row`: no row, because A's lease has not expired.
   - `owner_with_margin_should_return_one_row`: one row (`isHeldBy` for A with a 1 s margin).
   - `margin_above_remaining_should_return_no_row`: no row (a 60 s margin is more than A has left).
   - `other_owner_should_return_no_row`: no row (B does not hold it).
   - `expired_takeover_owner_should_be_b`: one row, owner B, after A's lease was forced to expire.
   - `wrong_owner_release_should_return_no_row`: no row, because A no longer owns it.
   - `owner_release_should_return_b`: one row.
   - `expires_after_release_should_be_zero`: `0`.
6. The final query counts only the smoke account's row (the id in its `smoke_ids` list) and must return zeros. It keeps working once real leases exist.
7. Rollback is a separate file, `main` first, then `test`. Do not run it as part of the apply. Dropping the table is safe only while no deployed code takes leases; afterwards it makes every acquire fail.

## Manual check with two sessions (test schema)

The smoke tests run in one session, so they cannot show the concurrent case. After the `test` table exists, open two sessions as `admin`. In each, with a different owner id (`owner-a` in the first, `owner-b` in the second), run:

```sql
BEGIN;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000009'::varchar, 'owner-a'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id;
```

Run it in both sessions before committing either, then `COMMIT;` in the first, then in the second. Expected: exactly one commit succeeds and the other fails with SQLSTATE `40001`. If the second session starts after the first has committed, it returns no row instead. Either way there is one winner.

Then remove the test row and confirm the table holds nothing for that account:

```sql
DELETE FROM test.home_automation_credential_lease WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000009';
```

## `isHeldBy` is a check, not a lock

`CredentialLeaseRepository.isHeldBy(accountId, ownerId, { minRemainingMs })` is one read: true only when the row is owned by `ownerId` and expires more than `minRemainingMs` from now (database clock). Check-then-act is not atomic: the lease can lapse, and another Lambda can take it, between that read and the caller's write. The check only narrows the window. Pick `minRemainingMs` to outlast the write's worst case (request timeout plus network), and treat `false` as "do not write". A database conflict also answers `false`, so the fence fails closed.

## Order of operations

1. Pre-flight, `test` UP, `main` UP.
2. Verification, then the smoke tests, then the two-session check.
3. Only then deploy code that takes leases. Any change under `backend/ORM/` redeploys every Lambda.

The entity is registered in `backend/ORM/util/database/Tables.js`. The repository uses raw SQL, so it needs no registration in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`.

## Status

Applied on the `test` schema on 2026-10-16, as `admin`. `main` is **not** applied.

Results on `test`, all as expected: pre-flight empty; table created with 5 `NOT NULL` columns and one valid primary-key index; Step 0 returned `1792144989333`, so DSQL accepts `floor(EXTRACT(EPOCH FROM now()) * 1000)::bigint`; all ten smoke results as expected, including the three `isHeldBy` checks; final check 0.

Two-session check, run twice: the first commit won (`owner-a`) and the second failed with `ERROR: 40001: change conflicts with another transaction (OC000)`. The conflict shows as SQLSTATE `40001` (visible with `set VERBOSITY verbose`); `OC000` appears only in the message. `isDsqlConflict` matches on the SQLSTATE, so the repository treats it as "not acquired". The test row was removed afterwards (count 0).
