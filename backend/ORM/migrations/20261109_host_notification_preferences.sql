SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'host_notification_preferences';

CREATE TABLE IF NOT EXISTS test.host_notification_preferences (
    user_id VARCHAR NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS main.host_notification_preferences (
    user_id VARCHAR NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (user_id)
);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%host_notification_preferences%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'host_notification_preferences'
ORDER BY table_schema, ordinal_position;
