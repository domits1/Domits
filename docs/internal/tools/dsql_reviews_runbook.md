# Review persistence migration

## Status

2026-10-19: NOT APPLIED by this change. AWS identity check failed with `NoCredentials`. Applying and verifying this migration remains a merge blocker. After execution, record operator, UTC timestamp, account/cluster, schema verification results, and any completed index job IDs here. If all objects already existed and no jobs were started, record that explicitly.

## Scope and files

The foundation contains four ORM models, registration, and schema migration; no create endpoint or ReviewSystem router.

- Apply: `backend/ORM/migrations/20260930_create_reviews.sql`
- Rollback: `backend/ORM/migrations/20260930_create_reviews_rollback.sql`
- JavaScript record: `backend/ORM/migrations/20260930_create_reviews.js`

The apply SQL mirrors up(). Run it manually; the JavaScript record does not prove deployment.

## Preflight

Use the [DSQL connection procedure](dsql_transitioning_docs.md). Resolve `/aurora/dsql/host`, `/aurora/dsql/region`, and `/aurora/dsql/dbName` from SSM in eu-north-1; confirm the account and intended cluster with the environment owner. Connect using the runtime's admin role.

```sql
SELECT table_schema, table_name, column_name, data_type,
       character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('test', 'main')
  AND table_name IN ('review', 'review_rating', 'review_category', 'review_request')
ORDER BY table_schema, table_name, ordinal_position;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname IN ('test', 'main')
  AND tablename IN ('review', 'review_request', 'review_rating', 'review_category');

SELECT * FROM sys.jobs;
```

Compare existing columns, defaults, primary keys, and indexes against the apply SQL and models. IF NOT EXISTS silently retains incompatible objects. Stop on differences and plan a data-preserving repair; never drop existing review tables. Record counts of each existing table before applying. Resolve active or failed review index builds first.

For existing tables, check duplicate keys before creating unique indexes. Run for test and main (substitute the schema below):

```sql
SELECT booking_id, review_type, reviewer_user_id, count(*)
FROM test.review
GROUP BY booking_id, review_type, reviewer_user_id HAVING count(*) > 1;
SELECT booking_id, review_type, guest_id, count(*)
FROM test.review_request
GROUP BY booking_id, review_type, guest_id HAVING count(*) > 1;
```

Duplicates block application; resolve with the data owner without automatically deleting reviews.

## Apply and verify before merge

1. Use a quiet window and autocommit, one DDL statement per transaction. Do not wrap the file in BEGIN. Enable ON_ERROR_STOP when using psql.
2. Execute the test statements first. IF NOT EXISTS starts no builds for indexes that already exist. Only for newly started builds, record their job IDs and check sys.jobs until they complete successfully. Verify existing indexes directly instead of waiting for jobs that were never started.
3. Execute main statements. Wait only for builds started by this apply, saving their job IDs and results while available. If all tables and indexes already exist, expect no new jobs and proceed to catalog verification. Investigate existing in-progress or failed review builds before continuing.
4. Repeat column and index inspection. Verify all eight tables match the SQL and all four unique indexes have the intended keys and are valid:

```sql
SELECT n.nspname, c.relname, i.indisvalid, pg_get_indexdef(i.indexrelid)
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('test', 'main')
  AND c.relname IN ('review_booking_type_reviewer_unique',
    'review_booking_type_reviewer_unique_test',
    'review_request_booking_type_guest_unique_main',
    'review_request_booking_type_guest_unique_test');
```

5. Compare existing table counts with preflight, accounting for concurrent writes. Run ORM tests and representative existing review reads in the intended environment. Coordinate normal application retries/reconnections after catalog changes.
6. Update Status with actual evidence before merge. A submitted async job is not a completed migration.

## Rollback

Both down() and rollback SQL intentionally leave the database unchanged. Tables predate this migration and IF NOT EXISTS cannot establish ownership of tables or indexes. Dropping even an index could remove a pre-existing uniqueness guarantee. Revert application code while retaining the compatible schema; rollback SQL executes only a harmless SELECT. Object removal requires a separate reviewed migration with proven ownership and impact assessment. Never drop real reviews as rollback.

## Stack audit

Local cached refs show guest submission and review-api-routing-auth contain the pre-reduction foundation commit 970190fbb. Remote verification failed on 2026-10-19 because git fetch could not resolve GitHub (`getaddrinfo() thread failed to start`). No branches were rewritten. Rebase status is unverified.

Fetch current refs and identify each PR's actual parent. Rebase from foundation outward, replaying only each branch's own commits, preserving dependent feature code, and running its tests. Do not rebase all branches directly onto acceptance. Inspect diffs for reintroduced removed code before publishing a rewrite with force-with-lease.

## Outstanding live-schema parity

The reviewer reports additional unique rules on review_rating and review_category. Their exact definitions are not recorded in this repository. Capture the index inspection results for both schemas before modifying the migration; do not infer key columns or index names. The reviewer approved this as a non-blocking follow-up; live uniqueness parity remains outstanding. The main request index uses the reported live name review_request_booking_type_guest_unique_main to avoid creating a duplicate.

## Unique-rule inspection

Capture the following results before adding the missing rating and category rules to the JavaScript and hand-run SQL migrations. Preserve the exact live names and keys to avoid duplicate indexes.

```sql
SELECT n.nspname AS schema_name, t.relname AS table_name,
       c.relname AS index_name, i.indisunique, i.indisvalid,
       pg_get_indexdef(i.indexrelid) AS index_definition
FROM pg_index i
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname IN ('review_rating', 'review_category')
  AND i.indisunique
ORDER BY schema_name, table_name, index_name;
```

## ReviewSystem trend deployment approval

Changes to `backend/CD` and `.github/workflows/deploy.yml` require senior developer or DevOps approval before merge. Record the approver and a link to their PR review; tests do not establish this approval.

The configuration helper runs only when ReviewSystem is selected for deployment, including shared-backend rebuilds. It manages `REVIEW_DECLINE_THRESHOLD` and `REVIEW_TREND_MIN_REVIEWS`, preserves other environment settings, and does not configure the review edit window. Both trend values must be valid in GitHub repository variables or the existing Lambda environment.

The owner of the deployment credentials must verify the following permissions against the actual target account and region:

```json
{
  "Effect": "Allow",
  "Action": [
    "lambda:GetFunctionConfiguration",
    "lambda:UpdateFunctionConfiguration"
  ],
  "Resource": "arn:aws:lambda:eu-north-1:<account-id>:function:ReviewSystem"
}
```

An operator with IAM simulation permission can check the deployment identity without updating Lambda:

```sh
aws iam simulate-principal-policy \
  --policy-source-arn <deployment-role-or-user-arn> \
  --action-names lambda:GetFunctionConfiguration lambda:UpdateFunctionConfiguration \
  --resource-arns arn:aws:lambda:eu-north-1:<account-id>:function:ReviewSystem \
  --query 'EvaluationResults[].{Action:EvalActionName,Decision:EvalDecision}'
```

Confirm both actions are allowed and check applicable permissions boundaries, session policies, and organization policies. Record the principal ARN, target resource, result, and confirmation time with the approval. Successfully reading configuration does not prove update permission.

If configuration validation or AWS access fails, the workflow skips ReviewSystem, continues other selected functions, and reports a failed run at the end. Approval and permission confirmation remain merge prerequisites. This runbook does not grant permissions or record approval on behalf of the team.
