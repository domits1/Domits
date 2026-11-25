-- 2026-11-24 document and document_version tables (schemas: test, main)
-- Runbook: docs/internal/tools/dsql_document_runbook.md
-- Run order:
-- 1) Run this file statement by statement, in order, each statement on its own in autocommit.
--    The test schema first, then main. Never wrap the DDL in BEGIN.
-- 2) After each schema's DDL, re-run its sys.jobs query until every index job reads completed.
--    Before the first smoke block, every index in the catalog query must show indisvalid = true.
-- 3) The smoke blocks write into test and main inside BEGIN ... ROLLBACK.
--    Run each block as a whole, from BEGIN to its ROLLBACK, so nothing is committed.
-- 4) The last four BEGIN ... ROLLBACK blocks are negative checks. Their INSERT is expected to fail
--    with a check violation (SQLSTATE 23514) on document_version_version_number_check or
--    document_version_file_size_check (suffix _test in test). Run the ROLLBACK after the error.
-- 5) Finish with the zero-rows check at the end of the file: every count must be 0.

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('document', 'document_version')
ORDER BY table_schema ASC, table_name ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%document%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.document (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
    review_status VARCHAR(20) NULL,
    current_version_id UUID NULL,
    issue_date BIGINT NULL,
    expiration_date BIGINT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    archived_at BIGINT NULL,
    deleted_at BIGINT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_idx_test
ON test.document (host_id);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_category_idx_test
ON test.document (host_id, category);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_expiration_date_idx_test
ON test.document (host_id, expiration_date);

CREATE TABLE IF NOT EXISTS test.document_version (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    storage_key VARCHAR(1024) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    checksum VARCHAR(128) NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    change_description TEXT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT document_version_version_number_check_test CHECK (version_number >= 1),
    CONSTRAINT document_version_file_size_check_test CHECK (file_size > 0)
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_version_document_id_version_number_unique_test
ON test.document_version (document_id, version_number);

CREATE INDEX ASYNC IF NOT EXISTS document_version_host_id_idx_test
ON test.document_version (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.document%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.document (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
    review_status VARCHAR(20) NULL,
    current_version_id UUID NULL,
    issue_date BIGINT NULL,
    expiration_date BIGINT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    archived_at BIGINT NULL,
    deleted_at BIGINT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_idx
ON main.document (host_id);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_category_idx
ON main.document (host_id, category);

CREATE INDEX ASYNC IF NOT EXISTS document_host_id_expiration_date_idx
ON main.document (host_id, expiration_date);

CREATE TABLE IF NOT EXISTS main.document_version (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    storage_key VARCHAR(1024) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    checksum VARCHAR(128) NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    change_description TEXT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT document_version_version_number_check CHECK (version_number >= 1),
    CONSTRAINT document_version_file_size_check CHECK (file_size > 0)
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_version_document_id_version_number_unique
ON main.document_version (document_id, version_number);

CREATE INDEX ASYNC IF NOT EXISTS document_version_host_id_idx
ON main.document_version (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.document%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('document', 'document_version')
ORDER BY table_schema ASC, table_name ASC, column_name ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns,
       pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname IN ('document', 'document_version')
ORDER BY n.nspname ASC, t.relname ASC, c.relname ASC;

SELECT n.nspname AS schema_name, c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname = 'document_version'
  AND c.contype = 'c'
ORDER BY n.nspname ASC, c.conname ASC;

BEGIN;
INSERT INTO test.document (id, host_id, title, category, created_by, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'Smoke document', 'smoke-category', 'smoke-user',
        1790000000000, 1790000000000);
INSERT INTO test.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-v1.pdf', 'smoke-v1.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000);
INSERT INTO test.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 2,
        'smoke-host/smoke-v2.pdf', 'smoke-v2.pdf', 'application/pdf', 2048, 'smoke-user', 1790000000000);
INSERT INTO test.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-v1-again.pdf', 'smoke-v1-again.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000)
ON CONFLICT DO NOTHING;
SELECT status AS default_status_should_be_active
FROM test.document
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT visibility AS default_visibility_should_be_internal
FROM test.document
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS versions_should_be_two
FROM test.document_version
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO main.document (id, host_id, title, category, created_by, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'Smoke document', 'smoke-category', 'smoke-user',
        1790000000000, 1790000000000);
INSERT INTO main.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-v1.pdf', 'smoke-v1.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000);
INSERT INTO main.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 2,
        'smoke-host/smoke-v2.pdf', 'smoke-v2.pdf', 'application/pdf', 2048, 'smoke-user', 1790000000000);
INSERT INTO main.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-v1-again.pdf', 'smoke-v1-again.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000)
ON CONFLICT DO NOTHING;
SELECT status AS default_status_should_be_active
FROM main.document
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT visibility AS default_visibility_should_be_internal
FROM main.document
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS versions_should_be_two
FROM main.document_version
WHERE document_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO test.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 0,
        'smoke-host/smoke-v0.pdf', 'smoke-v0.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000);
ROLLBACK;

BEGIN;
INSERT INTO test.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-empty.pdf', 'smoke-empty.pdf', 'application/pdf', 0, 'smoke-user', 1790000000000);
ROLLBACK;

BEGIN;
INSERT INTO main.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 0,
        'smoke-host/smoke-v0.pdf', 'smoke-v0.pdf', 'application/pdf', 1024, 'smoke-user', 1790000000000);
ROLLBACK;

BEGIN;
INSERT INTO main.document_version (id, document_id, host_id, version_number, storage_key, file_name, mime_type, file_size, uploaded_by, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 1,
        'smoke-host/smoke-empty.pdf', 'smoke-empty.pdf', 'application/pdf', 0, 'smoke-user', 1790000000000);
ROLLBACK;

WITH smoke_ids (id) AS (VALUES ('aaaaaaaa-0000-4000-8000-000000000001'::uuid), ('aaaaaaaa-0000-4000-8000-000000000002'::uuid), ('aaaaaaaa-0000-4000-8000-000000000003'::uuid), ('aaaaaaaa-0000-4000-8000-000000000004'::uuid), ('aaaaaaaa-0000-4000-8000-000000000005'::uuid), ('aaaaaaaa-0000-4000-8000-000000000006'::uuid))
SELECT 'test' AS schema_name,
       (SELECT count(*) FROM test.document WHERE id IN (SELECT id FROM smoke_ids)) AS documents_should_be_zero,
       (SELECT count(*) FROM test.document_version WHERE id IN (SELECT id FROM smoke_ids)) AS versions_should_be_zero
UNION ALL
SELECT 'main',
       (SELECT count(*) FROM main.document WHERE id IN (SELECT id FROM smoke_ids)),
       (SELECT count(*) FROM main.document_version WHERE id IN (SELECT id FROM smoke_ids));
