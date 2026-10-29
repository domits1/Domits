SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'property_task'
  AND column_name IN ('overdue_last_notified_at', 'overdue_notify_count');

ALTER TABLE test.property_task
    ADD COLUMN IF NOT EXISTS overdue_last_notified_at BIGINT;

ALTER TABLE test.property_task
    ADD COLUMN IF NOT EXISTS overdue_notify_count BIGINT;

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS overdue_last_notified_at BIGINT;

ALTER TABLE main.property_task
    ADD COLUMN IF NOT EXISTS overdue_notify_count BIGINT;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'property_task'
  AND column_name IN ('overdue_last_notified_at', 'overdue_notify_count')
ORDER BY table_schema, column_name;
