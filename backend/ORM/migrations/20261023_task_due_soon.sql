-- Run as the admin user, test schema first, then main. One statement at a time: Aurora DSQL allows
-- one DDL statement per transaction. Both columns are nullable on purpose (DSQL cannot add a column
-- with a default), and an empty value means "not emailed yet" and "on".
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE (table_name = 'property_task' AND column_name = 'due_soon_notified_for')
   OR (table_name = 'host_settings' AND column_name = 'notif_email_due_soon');

ALTER TABLE test.property_task
    ADD COLUMN IF NOT EXISTS due_soon_notified_for BIGINT;

ALTER TABLE test.host_settings
    ADD COLUMN IF NOT EXISTS notif_email_due_soon BOOLEAN;

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS due_soon_notified_for BIGINT;

ALTER TABLE main.host_settings
    ADD COLUMN IF NOT EXISTS notif_email_due_soon BOOLEAN;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE (table_name = 'property_task' AND column_name = 'due_soon_notified_for')
   OR (table_name = 'host_settings' AND column_name = 'notif_email_due_soon')
ORDER BY table_schema, table_name, column_name;
