-- Run as the admin user, test schema first, then main. One statement at a time: Aurora DSQL allows
-- one DDL statement per transaction. The column is nullable on purpose (DSQL cannot add a column
-- with a default), and an empty value means "not approved".
SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'property_task'
  AND column_name = 'approved_at';

ALTER TABLE test.property_task
    ADD COLUMN IF NOT EXISTS approved_at BIGINT;

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS approved_at BIGINT;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'property_task'
  AND column_name = 'approved_at'
ORDER BY table_schema;
