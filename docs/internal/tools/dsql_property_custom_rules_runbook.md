# Property custom rules table (2026-10-07)

Runbook for the hand-applied migration under `backend/ORM/migrations/`:

- `20261006_create_property_custom_rules.{js,sql}`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here instead.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, as Admin, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`). The runtime itself connects as the `admin` database user with a `DbConnectAdmin` token (`backend/ORM/index.js:98-99`), so the session you apply this from needs the same admin role.

## What the table is for

One row per custom house rule of a property (for example category `Safety`, rule text "No shoes inside"), written by the PropertyHandler Lambda through `propertyCustomRuleRepository.js` and read back by the guest reservation page as its special instructions. `replaceCustomRulesByPropertyId` deletes every row of a property and inserts the new set, so the only lookup is by `property_id`, which is why that column carries the index.

## Until it is applied

Two different states can exist in a schema before this migration runs, and they fail differently:

- **The table is missing.** `propertyService.getCustomRules` and `updateCustomRules` catch the missing-table error (SQLSTATE `42P01`), log a warning and return `[]`. Reads come back empty and a host's saved custom rules are silently dropped while the request reports success.
- **The table already exists with different column types.** This is what `main` looked like when the migration was applied: an empty `property_custom_rules` with `uuid` id columns, where the entity expects `varchar`. `CREATE TABLE IF NOT EXISTS` skips an existing table without a word, so running the file would have reported success and left the mismatch in place. Nothing about the table being present triggers the missing-table fallback either.

Apply the migration, with the pre-flight below, before relying on the feature, in every environment that serves the PropertyHandler Lambda. The missing-table fallback is still in the code; with the table in place in both schemas it should not trigger, and a `table not yet migrated` warning in a Lambda log (logged by both `getCustomRules` and `updateCustomRules`) means a schema is missing it.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction, never DDL and DML in the same transaction. Run each statement on its own in psql autocommit mode (or one query at a time in the Query Editor); never wrap a block in `BEGIN`. The only `BEGIN` blocks in the file are the smoke tests, which contain DML only.
- The indexes are created with `CREATE INDEX ASYNC`. The statement returns immediately and the build runs in the background, so check `sys.jobs` until the job reads `completed`. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit and every index activation bumps the cluster-wide catalog version. Sessions holding a stale catalog, including warm Lambdas, fail their next statement once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window, back to back. This applies to DDL on the `test` schema too.
- The tables are created empty, so there is no backfill and the 3,000-row transaction limit does not come into play. Do not assume they are new, though: a table of that name may already exist (see the pre-flight below), and only an empty one may be dropped and recreated.
- No `CHECK` constraints on any column, and no foreign key to `property`, matching this codebase's convention of no TypeORM relations. A column constraint cannot be altered later without recreating the table. Values (a non-empty `rule_text`, the category) are enforced in code.
- There is no `ALTER COLUMN ... TYPE`, so a width is permanent. `id` and `property_id` are `VARCHAR(255)`, like every other `property_id` column. `category` is an unbounded `VARCHAR`, exactly what the entity declares with `type: "varchar"`, because nothing in the controller caps its length and a bounded column would turn an over-long category into a failed insert.
- Index names carry a `_test` suffix on the `test` schema, as for `booking`, so a `sys.jobs` filter or a catalog read cannot confuse the two.

## Blocks in the file, in order

1. Pre-flight `SELECT` on `information_schema.tables`: expect no row, meaning the table exists in neither schema. If a row comes back, the table already exists and may have **different column types** from the entity, as `main` did (`uuid` ids instead of `varchar`). `CREATE TABLE IF NOT EXISTS` will skip it silently, so check it before going on: run the column query from block 7 against that schema and compare it with the expected types, then `count(*)` the table. A table that matches needs no change. A table that does not match is **drop-and-recreate with sign-off**: confirm it is empty (`count(*) = 0`), get explicit approval from the owners (here Stefan and Robert approved it), run the schema's rollback statements from block 9 (`DROP INDEX`, `DROP TABLE`), then apply that schema's `CREATE TABLE` and index from the file. A table that does not match and is **not** empty must not be dropped; stop and escalate.
2. Pre-flight on `sys.jobs`: no row for `%property_custom_rules%` with status `submitted` or `processing`. An in-flight job means someone else is applying this right now.
3. `test` schema: `CREATE TABLE IF NOT EXISTS test.property_custom_rules`, then `CREATE INDEX ASYNC IF NOT EXISTS property_custom_rules_property_id_idx_test`.
4. Wait for the `test` index job: re-run the `sys.jobs` query filtered on `test.property_custom_rules%` until it reads `completed`.
5. `main` schema: the same table and `property_custom_rules_property_id_idx`.
6. Wait for the `main` index job the same way, filtered on `main.property_custom_rules%`.
7. Verification: six columns per schema with the expected types and nullability (`id`, `property_id`, `category`, `rule_text`, `enabled` default `true`, `created_at`, all NOT NULL); both indexes present with `indisvalid = t`, `property_id` as their key column, read through `pg_namespace` so the two schemas cannot be confused.
8. Smoke tests: one `BEGIN ... INSERT ... SELECT ... ROLLBACK` block per schema. The row must come back from the `SELECT` and leave nothing behind, which the `count(*)` after them confirms as zero for both schemas.
9. Rollback: `DROP INDEX` then `DROP TABLE`, `main` first, then `test`, all schema-qualified so they cannot silently miss when `search_path` does not include them. Last in the file; do not paste the file top to bottom.

## Order of operations

1. Pre-flight (including the existing-table check in block 1), then `test` UP, wait for its index job, then `main` UP, wait for its index job.
2. Verification, then the smoke tests.
3. Only then deploy the code that reads and writes the table. Any change under `backend/ORM/` (here `Tables.js` registering the entity) redeploys every Lambda. `backend/test/ORM/propertyCustomRuleEntity.test.js` fails if the entity, `schema.psql` or the migration `.sql` drift from each other.

## Status

Applied by Rakib Sheikh on 2026-10-08 to the `test` schema first, then `main`, and verified.

Finding during the apply: `main.property_custom_rules` already existed with `uuid` id columns, which does not match the entity (`varchar`). Because `CREATE TABLE IF NOT EXISTS` would have silently kept that table, it was dropped first and recreated with `varchar(255)` ids as in the file. The old table was empty (0 rows), and dropping it was approved by Stefan and Robert.
