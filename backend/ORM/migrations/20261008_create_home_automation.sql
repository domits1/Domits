SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('home_automation_device', 'access_credential')
ORDER BY table_schema ASC, table_name ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE (object_name LIKE '%home_automation_device%' OR object_name LIKE '%access_credential%')
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.home_automation_device (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    provider_device_id VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    unit_id VARCHAR(255) NULL,
    device_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NULL,
    capabilities TEXT NULL,
    status VARCHAR(50) NOT NULL,
    battery_level INTEGER NULL,
    last_seen_at BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS home_automation_device_provider_unique_test
ON test.home_automation_device (integration_account_id, provider_device_id);

CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_property_id_idx_test
ON test.home_automation_device (property_id);

CREATE TABLE IF NOT EXISTS test.access_credential (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    booking_id VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    guest_id VARCHAR(255) NULL,
    provider_credential_id VARCHAR(255) NULL,
    credential_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    valid_from BIGINT NOT NULL,
    valid_until BIGINT NOT NULL,
    revoked_at BIGINT NULL,
    failure_reason TEXT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_booking_device_unique_test
ON test.access_credential (booking_id, device_id);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_provider_credential_unique_test
ON test.access_credential (integration_account_id, provider_credential_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.home_automation_device%'
   OR object_name LIKE 'test.access_credential%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.home_automation_device (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    provider_device_id VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    unit_id VARCHAR(255) NULL,
    device_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NULL,
    capabilities TEXT NULL,
    status VARCHAR(50) NOT NULL,
    battery_level INTEGER NULL,
    last_seen_at BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS home_automation_device_provider_unique
ON main.home_automation_device (integration_account_id, provider_device_id);

CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_property_id_idx
ON main.home_automation_device (property_id);

CREATE TABLE IF NOT EXISTS main.access_credential (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    booking_id VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    guest_id VARCHAR(255) NULL,
    provider_credential_id VARCHAR(255) NULL,
    credential_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    valid_from BIGINT NOT NULL,
    valid_until BIGINT NOT NULL,
    revoked_at BIGINT NULL,
    failure_reason TEXT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_booking_device_unique
ON main.access_credential (booking_id, device_id);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_provider_credential_unique
ON main.access_credential (integration_account_id, provider_credential_id);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.home_automation_device%'
   OR object_name LIKE 'main.access_credential%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name IN ('home_automation_device', 'access_credential')
ORDER BY table_schema ASC, table_name ASC, column_name ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname IN ('home_automation_device', 'access_credential')
ORDER BY n.nspname ASC, t.relname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.home_automation_device (id, integration_account_id, provider_device_id, property_id, device_type, status, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'smoke-device',
        'aaaaaaaa-0000-4000-8000-000000000003', 'LOCK', 'ACTIVE', 1790000000000, 1790000000000);
INSERT INTO test.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000007',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS should_be_one, min(status) AS default_status
FROM test.access_credential
WHERE booking_id = 'aaaaaaaa-0000-4000-8000-000000000005';
SELECT count(*) AS should_be_two
FROM test.access_credential
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND provider_credential_id IS NULL;
ROLLBACK;

BEGIN;
INSERT INTO main.home_automation_device (id, integration_account_id, provider_device_id, property_id, device_type, status, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'smoke-device',
        'aaaaaaaa-0000-4000-8000-000000000003', 'LOCK', 'ACTIVE', 1790000000000, 1790000000000);
INSERT INTO main.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000005',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.access_credential (id, integration_account_id, booking_id, property_id, device_id, credential_type, valid_from, valid_until, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000007',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'PIN', 1790000000000, 1790086400000, 1790000000000, 1790000000000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS should_be_one, min(status) AS default_status
FROM main.access_credential
WHERE booking_id = 'aaaaaaaa-0000-4000-8000-000000000005';
SELECT count(*) AS should_be_two
FROM main.access_credential
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND provider_credential_id IS NULL;
ROLLBACK;

SELECT 'test' AS schema_name, (SELECT count(*) FROM test.home_automation_device) AS devices_should_be_zero,
       (SELECT count(*) FROM test.access_credential) AS credentials_should_be_zero
UNION ALL
SELECT 'main', (SELECT count(*) FROM main.home_automation_device), (SELECT count(*) FROM main.access_credential);
