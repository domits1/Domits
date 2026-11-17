SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name = 'home_automation_device_audit'
ORDER BY table_schema ASC;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%home_automation_device_audit%'
  AND status IN ('submitted', 'processing');

CREATE TABLE IF NOT EXISTS test.home_automation_device_audit (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    provider_device_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_property_id VARCHAR(255) NULL,
    new_property_id VARCHAR(255) NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_audit_account_created_idx_test
ON test.home_automation_device_audit (integration_account_id, created_at);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.home_automation_device_audit%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.home_automation_device_audit (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    integration_account_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    provider_device_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_property_id VARCHAR(255) NULL,
    new_property_id VARCHAR(255) NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_audit_account_created_idx
ON main.home_automation_device_audit (integration_account_id, created_at);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.home_automation_device_audit%'
ORDER BY update_time ASC;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name = 'home_automation_device_audit'
ORDER BY table_schema ASC, column_name ASC;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.relname AS index_name, i.indisunique, i.indisvalid,
       array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord), ',') AS key_columns
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname = 'home_automation_device_audit'
ORDER BY n.nspname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO test.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'REMAPPED', 'aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000005', 1790000001000)
ON CONFLICT DO NOTHING;
INSERT INTO test.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'UNMAPPED', 'aaaaaaaa-0000-4000-8000-000000000005', NULL, 1790000002000)
ON CONFLICT DO NOTHING;
INSERT INTO test.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000003000)
ON CONFLICT DO NOTHING;
INSERT INTO test.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000004000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS same_account_device_rows_should_be_four
FROM test.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND provider_device_id = 'smoke-device';
SELECT count(*) AS duplicate_id_rows_should_be_one
FROM test.home_automation_device_audit
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000011';
SELECT count(*) AS mapped_without_old_property_should_be_two
FROM test.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND action = 'MAPPED' AND old_property_id IS NULL AND new_property_id IS NOT NULL;
SELECT count(*) AS unmapped_without_new_property_should_be_one
FROM test.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND action = 'UNMAPPED' AND new_property_id IS NULL AND old_property_id IS NOT NULL;
ROLLBACK;

BEGIN;
INSERT INTO main.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000000000)
ON CONFLICT DO NOTHING;
INSERT INTO main.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'REMAPPED', 'aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000005', 1790000001000)
ON CONFLICT DO NOTHING;
INSERT INTO main.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'UNMAPPED', 'aaaaaaaa-0000-4000-8000-000000000005', NULL, 1790000002000)
ON CONFLICT DO NOTHING;
INSERT INTO main.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000003000)
ON CONFLICT DO NOTHING;
INSERT INTO main.home_automation_device_audit (id, integration_account_id, user_id, provider_device_id, action, old_property_id, new_property_id, created_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'smoke-device',
        'MAPPED', NULL, 'aaaaaaaa-0000-4000-8000-000000000004', 1790000004000)
ON CONFLICT DO NOTHING;
SELECT count(*) AS same_account_device_rows_should_be_four
FROM main.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND provider_device_id = 'smoke-device';
SELECT count(*) AS duplicate_id_rows_should_be_one
FROM main.home_automation_device_audit
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000011';
SELECT count(*) AS mapped_without_old_property_should_be_two
FROM main.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND action = 'MAPPED' AND old_property_id IS NULL AND new_property_id IS NOT NULL;
SELECT count(*) AS unmapped_without_new_property_should_be_one
FROM main.home_automation_device_audit
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND action = 'UNMAPPED' AND new_property_id IS NULL AND old_property_id IS NOT NULL;
ROLLBACK;

WITH smoke_ids (id) AS (VALUES ('aaaaaaaa-0000-4000-8000-000000000011'), ('aaaaaaaa-0000-4000-8000-000000000012'), ('aaaaaaaa-0000-4000-8000-000000000013'), ('aaaaaaaa-0000-4000-8000-000000000014'))
SELECT 'test' AS schema_name,
       (SELECT count(*) FROM test.home_automation_device_audit WHERE id IN (SELECT id FROM smoke_ids)) AS audit_rows_should_be_zero
UNION ALL
SELECT 'main',
       (SELECT count(*) FROM main.home_automation_device_audit WHERE id IN (SELECT id FROM smoke_ids));
