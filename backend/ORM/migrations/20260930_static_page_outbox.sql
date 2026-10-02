SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'standalone_site'
  AND column_name = 'static_page_revision';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'main'
  AND table_name = 'static_page_outbox';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%static_page_outbox%'
  AND status IN ('submitted', 'processing');

ALTER TABLE IF EXISTS main.standalone_site
ADD COLUMN IF NOT EXISTS static_page_revision BIGINT NULL;

CREATE TABLE IF NOT EXISTS main.static_page_outbox (
    site_id VARCHAR(255) PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    revision BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    failure_reason TEXT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    processed_at BIGINT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS static_page_outbox_status_updated
ON main.static_page_outbox (status, updated_at);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.static_page_outbox%'
ORDER BY update_time ASC;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'static_page_outbox'
ORDER BY column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname = 'static_page_outbox'
ORDER BY c.relname ASC;

SELECT count(*) AS sites_without_revision
FROM main.standalone_site
WHERE static_page_revision IS NULL;

BEGIN;
INSERT INTO main.static_page_outbox (
    site_id, property_id, host_id, revision, status, attempt_count, created_at, updated_at
) VALUES (
    'smoke-site', 'smoke-property', 'smoke-host', 1, 'PENDING', 0, 1790000000000, 1790000000000
);
INSERT INTO main.static_page_outbox (
    site_id, property_id, host_id, revision, status, attempt_count, created_at, updated_at
) VALUES (
    'smoke-site', 'smoke-property', 'smoke-host', 2, 'PENDING', 0, 1790000000001, 1790000000001
)
ON CONFLICT (site_id) DO UPDATE SET
    revision = EXCLUDED.revision,
    status = 'PENDING',
    updated_at = EXCLUDED.updated_at;
SELECT site_id, revision, status FROM main.static_page_outbox WHERE site_id = 'smoke-site';
ROLLBACK;

SELECT count(*) AS should_be_zero
FROM main.static_page_outbox
WHERE site_id = 'smoke-site';
