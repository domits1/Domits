-- 2026-11-26 document_relationship and document_activity tables (schemas: test, main)
-- Runbook: docs/internal/tools/dsql_document_relationship_activity_runbook.md
-- Run order:
-- 1) Run this file statement by statement, in order, each statement on its own in autocommit.
--    The test schema first, then main. Never wrap the DDL in BEGIN.
-- 2) After each schema's DDL, re-run its sys.jobs query until every index job reads completed.
--    Before the first smoke block, every index in the catalog query must show indisvalid = true.
-- 3) The smoke blocks write into test and main inside BEGIN ... ROLLBACK.
--    Run each block as a whole, from BEGIN to its ROLLBACK, so nothing is committed.
-- 4) Finish with the zero-rows check at the end of the file: every count must be 0.

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('document_relationship', 'document_activity')
ORDER BY table_schema ASC, table_name ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE (object_name LIKE '%document_relationship%' OR object_name LIKE '%document_activity%')
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.document_relationship (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_relationship_document_entity_unique_test
ON test.document_relationship (document_id, entity_type, entity_id);

CREATE INDEX ASYNC IF NOT EXISTS document_relationship_host_id_entity_idx_test
ON test.document_relationship (host_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS test.document_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS document_activity_document_id_created_at_idx_test
ON test.document_activity (document_id, created_at);

CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_idx_test
ON test.document_activity (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.document_relationship%' OR object_name LIKE 'test.document_activity%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.document_relationship (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_relationship_document_entity_unique
ON main.document_relationship (document_id, entity_type, entity_id);

CREATE INDEX ASYNC IF NOT EXISTS document_relationship_host_id_entity_idx
ON main.document_relationship (host_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS main.document_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS document_activity_document_id_created_at_idx
ON main.document_activity (document_id, created_at);

CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_idx
ON main.document_activity (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.document_relationship%' OR object_name LIKE 'main.document_activity%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('document_relationship', 'document_activity')
ORDER BY table_schema ASC, table_name ASC, column_name ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns,
       pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname IN ('document_relationship', 'document_activity')
ORDER BY n.nspname ASC, t.relname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-1', 'smoke-user', 1790000000000);
INSERT INTO test.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-2', 'smoke-user', 1790000000000);
INSERT INTO test.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-1', 'smoke-user', 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.document_activity (id, document_id, host_id, actor_id, action, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'smoke-user',
        'smoke-action', 1790000000000);
INSERT INTO test.document_activity (id, document_id, host_id, actor_id, action, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'smoke-user',
        'smoke-action', 1790000000001);
SELECT count(*) AS relationships_should_be_two
FROM test.document_relationship
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS activities_should_be_two
FROM test.document_activity
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO main.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-1', 'smoke-user', 1790000000000);
INSERT INTO main.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-2', 'smoke-user', 1790000000000);
INSERT INTO main.document_relationship (id, document_id, host_id, entity_type, entity_id, created_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host',
        'smoke-entity-type', 'smoke-entity-1', 'smoke-user', 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.document_activity (id, document_id, host_id, actor_id, action, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'smoke-user',
        'smoke-action', 1790000000000);
INSERT INTO main.document_activity (id, document_id, host_id, actor_id, action, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'smoke-user',
        'smoke-action', 1790000000001);
SELECT count(*) AS relationships_should_be_two
FROM main.document_relationship
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS activities_should_be_two
FROM main.document_activity
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

WITH smoke_ids (id) AS (VALUES ('aaaaaaaa-0000-4000-8000-000000000002'::uuid), ('aaaaaaaa-0000-4000-8000-000000000003'::uuid), ('aaaaaaaa-0000-4000-8000-000000000004'::uuid), ('aaaaaaaa-0000-4000-8000-000000000005'::uuid), ('aaaaaaaa-0000-4000-8000-000000000006'::uuid))
SELECT 'test' AS schema_name,
       (SELECT count(*) FROM test.document_relationship WHERE id IN (SELECT id FROM smoke_ids)) AS relationships_should_be_zero,
       (SELECT count(*) FROM test.document_activity WHERE id IN (SELECT id FROM smoke_ids)) AS activities_should_be_zero
UNION ALL
SELECT 'main',
       (SELECT count(*) FROM main.document_relationship WHERE id IN (SELECT id FROM smoke_ids)),
       (SELECT count(*) FROM main.document_activity WHERE id IN (SELECT id FROM smoke_ids));
