SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'task_notification';

CREATE TABLE IF NOT EXISTS test.task_notification (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    read_at BIGINT NULL
);

CREATE TABLE IF NOT EXISTS main.task_notification (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    read_at BIGINT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS task_notification_user
ON main.task_notification (user_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%task_notification%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'task_notification'
ORDER BY table_schema, ordinal_position;
