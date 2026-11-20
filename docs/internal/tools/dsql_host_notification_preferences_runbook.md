# Host notification preferences migration (#3171)

Create the host-level notification preference table in Aurora DSQL.

## Owner and timing

A database operator with Aurora DSQL Admin access runs this migration. The PR author coordinates the request, supplies the target environment, and verifies the result with the queries below. Apply it after the backend changes have been reviewed and **before enabling or deploying the host event-preferences endpoint to acceptance**.

Run the `test` schema first. Only continue with `main` after the test table has been created and verified. The Lambda does not run migrations at runtime.

## Apply

Connect to the target Aurora DSQL cluster as Admin. Run each statement separately and wait for schema-change jobs to complete before the next step.

1. Check whether either table already exists:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'host_notification_preferences'
ORDER BY table_schema;
```

2. Check for active schema jobs:

```sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');
```

3. Create the test table:

```sql
CREATE TABLE IF NOT EXISTS test.host_notification_preferences (
    user_id VARCHAR NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id)
);
```

4. Verify the test table before continuing:

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'test'
  AND table_name = 'host_notification_preferences'
ORDER BY ordinal_position;
```

5. Create the main table:

```sql
CREATE TABLE IF NOT EXISTS main.host_notification_preferences (
    user_id VARCHAR NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id)
);
```

6. Verify both tables and their columns:

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('test', 'main')
  AND table_name = 'host_notification_preferences'
ORDER BY table_schema, ordinal_position;
```

Both schemas must contain `user_id`, `preferences`, `created_at` and `updated_at`. The `user_id` column must be non-null and the primary key. The `preferences` column must be non-null with the empty-object default.

7. Confirm no table-creation job remains active:

```sql
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');
```

Record the environment, execution date, operator and verification output in the deployment record. The backend endpoint may be enabled only after both schemas are verified.

## Existing preference compatibility

No destructive data conversion is required. On the first host GET where no row exists in `host_notification_preferences`, the API reads that host's existing `communication_preferences` row and maps Reservation, Cancellation and Messages into the corresponding event keys. Legacy Push maps to In-app, while Email and SMS retain their values. Reservation and Cancellation Email remain enabled. The next successful save writes the complete matrix to the new table.

## Rollback

Roll back or disable the application code and deploy a version that no longer references `Host_Notification_Preferences` before dropping the table. Run the statements in `backend/ORM/migrations/20261109_host_notification_preferences_rollback.sql` separately, then verify that neither schema contains the table. Do not drop the table while the deployed TypeORM entity still includes it.
