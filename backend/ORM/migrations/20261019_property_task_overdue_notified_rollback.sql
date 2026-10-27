ALTER TABLE main.property_task
    DROP COLUMN IF EXISTS overdue_last_notified_at;

ALTER TABLE main.property_task
    DROP COLUMN IF EXISTS overdue_notify_count;

ALTER TABLE test.property_task
    DROP COLUMN IF EXISTS overdue_last_notified_at;

ALTER TABLE test.property_task
    DROP COLUMN IF EXISTS overdue_notify_count;
