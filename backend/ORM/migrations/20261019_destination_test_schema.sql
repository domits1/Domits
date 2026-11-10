SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'test'
  AND table_name IN ('destination', 'property_destination');

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.%destination%'
  AND status IN ('submitted', 'processing');

CREATE SCHEMA IF NOT EXISTS test;

CREATE TABLE IF NOT EXISTS test.destination (
    id VARCHAR(1024) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    parent_id VARCHAR(1024) NULL,
    slug VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS test.property_destination (
    property_id VARCHAR(255) PRIMARY KEY,
    destination_id VARCHAR(1024) NOT NULL,
    source_country VARCHAR(255) NOT NULL,
    source_city VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS destination_path_unique_test
ON test.destination (path);

CREATE INDEX ASYNC IF NOT EXISTS destination_parent_test
ON test.destination (parent_id);

CREATE INDEX ASYNC IF NOT EXISTS property_destination_destination_test
ON test.property_destination (destination_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.%destination%'
ORDER BY update_time ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'test'
  AND t.relname IN ('destination', 'property_destination')
ORDER BY t.relname ASC, c.relname ASC;
