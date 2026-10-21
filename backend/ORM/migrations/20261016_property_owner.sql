SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('property_owner', 'property_owner_property')
ORDER BY table_schema ASC, table_name ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%property_owner%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.property_owner (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200) NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(50) NULL,
    preferred_language VARCHAR(10) NULL,
    owner_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    owner_user_id VARCHAR(255) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_owner_host_id_idx_test
ON test.property_owner (host_id);

CREATE TABLE IF NOT EXISTS test.property_owner_property (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    ownership_basis_points INTEGER NOT NULL,
    effective_from BIGINT NOT NULL,
    effective_to BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_owner_property_from_unique_test
ON test.property_owner_property (owner_id, property_id, effective_from);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_open_unique_test
ON test.property_owner_property (owner_id, property_id)
WHERE effective_to IS NULL;

CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_property_id_idx_test
ON test.property_owner_property (property_id);

CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_host_id_idx_test
ON test.property_owner_property (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.property_owner%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.property_owner (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200) NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(50) NULL,
    preferred_language VARCHAR(10) NULL,
    owner_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    owner_user_id VARCHAR(255) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS property_owner_host_id_idx
ON main.property_owner (host_id);

CREATE TABLE IF NOT EXISTS main.property_owner_property (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    ownership_basis_points INTEGER NOT NULL,
    effective_from BIGINT NOT NULL,
    effective_to BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_owner_property_from_unique
ON main.property_owner_property (owner_id, property_id, effective_from);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_open_unique
ON main.property_owner_property (owner_id, property_id)
WHERE effective_to IS NULL;

CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_property_id_idx
ON main.property_owner_property (property_id);

CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_host_id_idx
ON main.property_owner_property (host_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.property_owner%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('property_owner', 'property_owner_property')
ORDER BY table_schema ASC, table_name ASC, column_name ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns,
       pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname IN ('property_owner', 'property_owner_property')
ORDER BY n.nspname ASC, t.relname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.property_owner (id, host_id, first_name, last_name, email, owner_type, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'Smoke', 'Owner', 'smoke-owner@example.com',
        'individual', 1790000000000, 1790000000000);
INSERT INTO test.property_owner (id, host_id, first_name, last_name, company_name, email, owner_type, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'smoke-host', 'Smoke', 'Company', 'Smoke Holding', 'smoke-company@example.com',
        'company', 1790000000000, 1790000000000);
INSERT INTO test.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        5000, 1767225600000, 1782864000000, 1790000000000, 1790000000000);
INSERT INTO test.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1782864000000, NULL, 1790000000000, 1790000000000);
INSERT INTO test.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1782864000000, 1788220800000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1785542400000, NULL, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000002', 'smoke-property', 'smoke-host',
        4000, 1782864000000, NULL, 1790000000000, 1790000000000);
SELECT status AS default_status_should_be_active
FROM test.property_owner
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS should_be_one
FROM test.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property'
  AND effective_from = 1782864000000;
SELECT count(*) AS periods_should_be_two
FROM test.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property';
SELECT count(*) AS open_should_be_one
FROM test.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property'
  AND effective_to IS NULL;
SELECT count(DISTINCT owner_id) AS owners_should_be_two
FROM test.property_owner_property
WHERE property_id = 'smoke-property'
  AND effective_to IS NULL;
ROLLBACK;

BEGIN;
INSERT INTO main.property_owner (id, host_id, first_name, last_name, email, owner_type, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'smoke-host', 'Smoke', 'Owner', 'smoke-owner@example.com',
        'individual', 1790000000000, 1790000000000);
INSERT INTO main.property_owner (id, host_id, first_name, last_name, company_name, email, owner_type, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'smoke-host', 'Smoke', 'Company', 'Smoke Holding', 'smoke-company@example.com',
        'company', 1790000000000, 1790000000000);
INSERT INTO main.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        5000, 1767225600000, 1782864000000, 1790000000000, 1790000000000);
INSERT INTO main.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1782864000000, NULL, 1790000000000, 1790000000000);
INSERT INTO main.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1782864000000, 1788220800000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', 'smoke-property', 'smoke-host',
        6000, 1785542400000, NULL, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.property_owner_property (id, owner_id, property_id, host_id, ownership_basis_points, effective_from, effective_to, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000002', 'smoke-property', 'smoke-host',
        4000, 1782864000000, NULL, 1790000000000, 1790000000000);
SELECT status AS default_status_should_be_active
FROM main.property_owner
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT count(*) AS should_be_one
FROM main.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property'
  AND effective_from = 1782864000000;
SELECT count(*) AS periods_should_be_two
FROM main.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property';
SELECT count(*) AS open_should_be_one
FROM main.property_owner_property
WHERE owner_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND property_id = 'smoke-property'
  AND effective_to IS NULL;
SELECT count(DISTINCT owner_id) AS owners_should_be_two
FROM main.property_owner_property
WHERE property_id = 'smoke-property'
  AND effective_to IS NULL;
ROLLBACK;

WITH smoke_ids (id) AS (VALUES ('aaaaaaaa-0000-4000-8000-000000000001'::uuid), ('aaaaaaaa-0000-4000-8000-000000000002'::uuid), ('aaaaaaaa-0000-4000-8000-000000000003'::uuid), ('aaaaaaaa-0000-4000-8000-000000000004'::uuid), ('aaaaaaaa-0000-4000-8000-000000000005'::uuid), ('aaaaaaaa-0000-4000-8000-000000000006'::uuid), ('aaaaaaaa-0000-4000-8000-000000000007'::uuid))
SELECT 'test' AS schema_name,
       (SELECT count(*) FROM test.property_owner WHERE id IN (SELECT id FROM smoke_ids)) AS owners_should_be_zero,
       (SELECT count(*) FROM test.property_owner_property WHERE id IN (SELECT id FROM smoke_ids)) AS assignments_should_be_zero
UNION ALL
SELECT 'main',
       (SELECT count(*) FROM main.property_owner WHERE id IN (SELECT id FROM smoke_ids)),
       (SELECT count(*) FROM main.property_owner_property WHERE id IN (SELECT id FROM smoke_ids));
