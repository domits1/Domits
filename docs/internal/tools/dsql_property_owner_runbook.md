# Property owner tables (2026-10-21)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3239, property owners):

- `20261016_property_owner.{js,sql}` and `20261016_property_owner_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run. Unlike most migration files it opens with a short comment header that repeats the run order, because reviewers asked for it in the file itself. The full run order, the Aurora DSQL rules and the expected results live here.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, as Admin, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1. The runtime connects as the `admin` database user (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same role.

## Purpose

- `property_owner`: one row per legal owner of one or more properties, scoped to the host who manages them (`host_id`). The owner can be a person or a company (`owner_type`), and has a `status` (default `active`). `owner_user_id` is empty until the owner gets a Domits login of their own.
- `property_owner_property`: one row per owner, property and ownership period. `ownership_basis_points` is the owner's share, where 10000 is 100%. `effective_from` and `effective_to` are epoch milliseconds, and `effective_to` stays NULL while the period is open. A change in share closes the open period and starts a new one, so the history is kept.

The two unique indexes enforce the period model:

- `property_owner_property_owner_property_from_unique`: one period per owner, property and start date.
- `property_owner_property_open_unique`: at most one open period (`effective_to IS NULL`) per owner and property.

## Prerequisites

- An admin session on the right cluster, confirmed from SSM as above.
- A quiet window. Every DDL commit and index activation bumps the catalog version, and warm Lambdas fail their next statement once with SQLSTATE `40001` / `OC001`. This applies to `test` too.
- Neither table exists yet in either schema (block 1 checks this).
- No index job on these tables is in flight (block 2 checks this).

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own in autocommit. Never wrap DDL in `BEGIN`. The only `BEGIN` blocks in the file are the smoke tests and the negative checks, and they contain DML only.
- Indexes are `CREATE [UNIQUE] INDEX ASYNC`. The statement returns at once and the build runs in the background. Wait until every job in `sys.jobs` reads `completed` and every index shows `indisvalid = t` before any smoke block runs. Without the unique indexes, the target-less `ON CONFLICT DO NOTHING` inserts would succeed, and `should_be_one` and `open_should_be_one` would read 2. `sys.jobs` forgets finished jobs after about 30 minutes.
- **CHECK constraints only for rules that never change.** A constraint cannot be altered later. `property_owner_property` carries two, written inline in the `CREATE TABLE`:
  - `property_owner_property_basis_points_check`: `ownership_basis_points BETWEEN 1 AND 10000`. A share is at least one basis point and at most 100%.
  - `property_owner_property_period_check`: `effective_to IS NULL OR effective_to > effective_from`. A closed period ends after it starts.
  - In `test` both names carry the `_test` suffix, as for `direct_booking_website_rate_plans`.
- **No CHECK on the `status` or `owner_type` lists.** Those lists may grow, and a constraint could not be changed to match. The service layer validates them.
- **No foreign keys.** Aurora DSQL supports them since August 2026, but a foreign key to the shared `property` table would change delete behaviour for other teams. Integrity between `property_owner_property`, `property_owner` and `property` stays in the service layer for now. That includes the rule that the open shares of one property add up to exactly 10000 at any point in time, which a row-level CHECK cannot express. A later PR enforces it in the service layer, through an endpoint that sets all shares of a property at once.
- Index and constraint names carry a `_test` suffix on the `test` schema, so a `sys.jobs` filter or a catalog read cannot confuse the two.

## Blocks in the file, in order

Run the file statement by statement, top to bottom: the `test` schema first, then `main`.

1. Pre-flight on `information_schema.tables`: expect no row. If a table already exists, `CREATE TABLE IF NOT EXISTS` skips it silently, so it would keep a shape without the CHECK constraints. Stop and compare it with blocks 7 to 9. Only an empty, mismatching table may be dropped and recreated, with the owners' sign-off.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job whose `object_name` contains `property_owner`.
3. `test` schema: `CREATE TABLE test.property_owner`, its index, `CREATE TABLE test.property_owner_property` with its two CHECK constraints, and its four indexes. Each statement on its own. Note each `job_id`.
4. Re-run the `sys.jobs` query filtered on `test.property_owner%` until all five index jobs read `completed`. A `failed` job leaves its index invalid: drop that index and run its statement again.
5. `main` schema: the same two tables, constraints and five indexes, without the suffix.
6. Re-run the `sys.jobs` query filtered on `main.property_owner%` until all five jobs read `completed`.
7. Columns: 46 rows, 14 for `property_owner` and 9 for `property_owner_property` in each schema. Only `company_name`, `phone`, `preferred_language`, `notes`, `owner_user_id` and `effective_to` are nullable. `status` has the default `'active'`.
8. Indexes: 14 rows, 7 per schema: the two primary keys plus the five indexes. Every row must show `indisvalid = t` before you go on. `indisunique = t` only on the primary keys, `property_owner_property_owner_property_from_unique` and `property_owner_property_open_unique`. The open-period index has the predicate `(effective_to IS NULL)`.
9. CHECK constraints: 4 rows, two per schema. PostgreSQL stores `BETWEEN` as two comparisons, so expect definitions of this form:
   - `property_owner_property_basis_points_check[_test]`: `CHECK (((ownership_basis_points >= 1) AND (ownership_basis_points <= 10000)))`
   - `property_owner_property_period_check[_test]`: `CHECK (((effective_to IS NULL) OR (effective_to > effective_from)))`
10. Smoke test on `test`, one `BEGIN ... ROLLBACK` block. Expected results:
    - The two inserts with `ON CONFLICT DO NOTHING` (rows `...05` and `...06`) report `INSERT 0 0`. Row `...05` repeats the start date of the open period (the start-date unique index). Row `...06` opens a second period for the same owner and property (the open-period unique index).
    - `default_status_should_be_active` = `active`
    - `should_be_one` = 1: one period on the shared `effective_from`.
    - `periods_should_be_two` = 2: the closed period and the open one.
    - `open_should_be_one` = 1: one row with `effective_to IS NULL` for the owner and property.
    - `owners_should_be_two` = 2: two distinct owners with an open period on the same property.
11. Smoke test on `main`: the same block and the same results.
12. Negative checks, four `BEGIN ... ROLLBACK` blocks: zero share on `test`, empty period on `test`, then the same two on `main`. **Each INSERT is expected to fail** with SQLSTATE `23514`, for example `new row for relation "property_owner_property" violates check constraint "property_owner_property_basis_points_check_test"`. The period block names `property_owner_property_period_check[_test]`. Run the block's `ROLLBACK` after the error. If an INSERT reports `INSERT 0 1` instead, the constraint is missing: run the `ROLLBACK`, stop, and check block 9.
13. Zero-rows check: two rows (`test`, `main`), with `owners_should_be_zero` and `assignments_should_be_zero` both 0. It counts only the smoke ids, so it keeps working once real rows exist.

Run each smoke block and each negative block as a whole, from `BEGIN` to its `ROLLBACK`. That way no smoke row is committed, even when a statement inside it fails.

## Order of operations

1. Blocks 1 and 2, then `test` (blocks 3 and 4), then `main` (blocks 5 and 6).
2. Verification (blocks 7 to 9). Every index must be valid before step 3.
3. Smoke tests (blocks 10 and 11), negative checks (block 12), and the zero-rows check (block 13).
4. Update the Status section below.

Nothing on this branch reads or writes the tables. TypeORM runs with `synchronize: false` (`backend/ORM/index.js`), so registering the entities in `backend/ORM/util/database/Tables.js` does not touch the database. Apply the migration before any code that queries the tables is deployed. Any change under `backend/ORM/` redeploys every Lambda. The entities are not registered in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`; the first Lambda that reads them through that package must add them there.

`backend/test/ORM/propertyOwnerEntity.test.js` fails if the entities, `schema.psql`, the migration `.sql` or the migration `.js` drift from each other. That includes the CHECK names and expressions, the smoke query conditions and the negative blocks.

## Rollback

`20261016_property_owner_rollback.sql` drops the indexes and then the tables: `main` first, then `test`. Run each statement on its own in autocommit. The CHECK constraints go with their table. Do not run the rollback as part of the apply.

Only roll back while the tables hold no real data, or after the owner data has been exported and the code that uses it has been rolled back. Dropping the tables loses the ownership history.

## Status

- `test` schema applied: Not applied (date: -, by: -)
- `main` schema applied: Not applied (date: -, by: -)
