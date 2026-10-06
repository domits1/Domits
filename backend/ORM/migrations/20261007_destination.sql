SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'main'
  AND table_name IN ('destination', 'property_destination');

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%destination%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS main.destination (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    parent_id VARCHAR(255) NULL,
    slug VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS main.property_destination (
    property_id VARCHAR(255) PRIMARY KEY,
    destination_id VARCHAR(255) NOT NULL,
    source_country VARCHAR(255) NOT NULL,
    source_city VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS destination_path_unique
ON main.destination (path);

CREATE INDEX ASYNC IF NOT EXISTS destination_parent
ON main.destination (parent_id);

CREATE INDEX ASYNC IF NOT EXISTS property_destination_destination
ON main.property_destination (destination_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.%destination%'
ORDER BY update_time ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname IN ('destination', 'property_destination')
ORDER BY t.relname ASC, c.relname ASC;

SELECT count(*) AS destinations FROM main.destination;

SELECT count(*) AS mapped_properties FROM main.property_destination;
