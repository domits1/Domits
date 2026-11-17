SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name = 'property_moderation_event'
ORDER BY table_schema ASC;

CREATE TABLE IF NOT EXISTS test.property_moderation_event (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    reason TEXT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_moderation_event_property_created_idx_test
ON test.property_moderation_event (property_id, created_at);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.property_moderation_event%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.property_moderation_event (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    reason TEXT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_moderation_event_property_created_idx
ON main.property_moderation_event (property_id, created_at);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.property_moderation_event%'
ORDER BY update_time ASC;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name = 'property_moderation_event'
ORDER BY table_schema ASC, ordinal_position ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname = 'property_moderation_event'
ORDER BY n.nspname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.property_moderation_event (id, property_id, action, actor_id, reason, from_status, to_status, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000009', 'REJECTED', 'smoke-actor', 'smoke reason', 'PENDING_REVIEW', 'REJECTED', 1790000002000)
ON CONFLICT DO NOTHING;
INSERT INTO test.property_moderation_event (id, property_id, action, actor_id, reason, from_status, to_status, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000009', 'APPROVED', 'smoke-actor', NULL, 'PENDING_REVIEW', 'ACTIVE', 1790000003000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS approved_reason_null_should_be_one
FROM test.property_moderation_event
WHERE property_id = 'aaaaaaaa-0000-4000-8000-000000000009' AND action = 'APPROVED' AND reason IS NULL;
SELECT count(*) AS property_events_should_be_two
FROM test.property_moderation_event
WHERE property_id = 'aaaaaaaa-0000-4000-8000-000000000009';
ROLLBACK;

BEGIN;
INSERT INTO main.property_moderation_event (id, property_id, action, actor_id, reason, from_status, to_status, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000009', 'REJECTED', 'smoke-actor', 'smoke reason', 'PENDING_REVIEW', 'REJECTED', 1790000002000)
ON CONFLICT DO NOTHING;
INSERT INTO main.property_moderation_event (id, property_id, action, actor_id, reason, from_status, to_status, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000009', 'APPROVED', 'smoke-actor', NULL, 'PENDING_REVIEW', 'ACTIVE', 1790000003000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS approved_reason_null_should_be_one
FROM main.property_moderation_event
WHERE property_id = 'aaaaaaaa-0000-4000-8000-000000000009' AND action = 'APPROVED' AND reason IS NULL;
SELECT count(*) AS property_events_should_be_two
FROM main.property_moderation_event
WHERE property_id = 'aaaaaaaa-0000-4000-8000-000000000009';
ROLLBACK;

SELECT 'test' AS schema_name, count(*) AS smoke_rows_should_be_zero
FROM test.property_moderation_event
WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003')
UNION ALL
SELECT 'main', count(*)
FROM main.property_moderation_event
WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003');
