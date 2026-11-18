# Review flag migration: deployment gate

## Status

2026-11-18: NOT APPLIED by this change. `aws sts get-caller-identity` failed
with `NoCredentials`. Live table/index state is unverified. Do not merge if
merge deploys ReviewSystem, and do not deploy the updated Lambda until an
authenticated operator applies and verifies the migration below.

Approval and publication now read `review_flag` in their transactions even
when a review has no flags. A missing table therefore breaks those operations.
Acceptance and www use the shared database; create the schema objects before
rolling out the application code. Do not disable the pending-flag checks.

## Apply artifacts

- SQL: `backend/ORM/migrations/20261108_create_review_flag.sql`
- Matching ORM migration: `backend/ORM/migrations/20261108_create_review_flag.js`

The SQL is generated from the migration's `up()` statements. It creates the
table and two indexes in `test` first, then `main`. It does not prove that any
live migration has run.

## Preflight

Authenticate the AWS CLI and run `aws sts get-caller-identity`. Resolve the
runtime cluster from `/aurora/dsql/host`, `/aurora/dsql/region` and
`/aurora/dsql/dbName` in SSM (`eu-north-1`), then connect as the authorized
database administrator using [the DSQL connection procedure](dsql_transitioning_docs.md).
Confirm the target account/cluster is the shared application database rather
than assuming the cluster in an older example is current.

Inspect existing columns and indexes before running DDL:

```sql
SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('test', 'main') AND table_name = 'review_flag'
ORDER BY table_schema, ordinal_position;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname IN ('test', 'main') AND tablename = 'review_flag';

SELECT * FROM sys.jobs;
```

If a table exists, compare it to the SQL and check for duplicate pending flags
in each existing schema before creating the unique index:

```sql
SELECT review_id, count(*) FROM main.review_flag
WHERE status = 'PENDING' GROUP BY review_id HAVING count(*) > 1;
```

Repeat for `test.review_flag`. Stop on incompatible objects, duplicates or
failed/in-progress related index jobs. Do not delete existing flags to make
the migration pass. `IF NOT EXISTS` does not repair incompatible objects.

## Apply and verify

1. Use autocommit and stop on the first SQL error. Do not wrap asynchronous
   index creation in an explicit transaction. With psql, enable `ON_ERROR_STOP`.
2. Execute the `test` statements first. Save any asynchronous index job IDs.
   Inspect `sys.jobs` until the jobs complete successfully; a submitted job
   alone does not mean the index is ready. If an index already exists, verify
   it directly rather than waiting for a job that was not started.
3. Execute the `main` statements and repeat the job checks.
4. Repeat column inspection and run:

```sql
SELECT n.nspname AS schema_name, c.relname AS index_name,
       i.indisvalid, i.indisunique, pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'main' AND c.relname IN
         ('review_flag_pending_unique', 'review_flag_queue'))
   OR (n.nspname = 'test' AND c.relname IN
         ('review_flag_pending_unique_test', 'review_flag_queue_test'));

SELECT 1 FROM main.review_flag LIMIT 1;
SELECT 1 FROM test.review_flag LIMIT 1;
```

Require four valid indexes with matching definitions: one unique index on
`review_id` restricted to `status = 'PENDING'` and one queue index on
`(status, created_at, id)` in each schema. Zero rows from an empty table read
are fine; a missing-table error is not.

5. Record the evidence below. Only then merge/deploy ReviewSystem. Run the
   normal authorized approval/publication checks in the test environment;
   do not mutate real reviews just to smoke-test deployment.

## Deployment evidence (required before merge/deployment)

- Operator / AWS identity: pending
- Applied at (UTC): pending
- Account / cluster / region: pending
- `test` table/column verification: pending
- `main` table/column verification: pending
- Async job IDs and successful completion (or pre-existing valid indexes): pending
- Four index definitions and validity verified: pending
- Authorized test-environment approval/publication checks: pending

## Rollback

Revert application code while retaining the additive table and indexes.
Do not run the ORM migration's destructive `down()` against populated data.
Removing audit records or schema objects needs a separate reviewed operation.
