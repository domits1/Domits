SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name = 'home_automation_credential_lease'
ORDER BY table_schema ASC;

CREATE TABLE IF NOT EXISTS test.home_automation_credential_lease (
    integration_account_id VARCHAR(255) NOT NULL PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    lease_expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS main.home_automation_credential_lease (
    integration_account_id VARCHAR(255) NOT NULL PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    lease_expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name = 'home_automation_credential_lease'
ORDER BY table_schema ASC, column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid, i.indisprimary
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname IN ('main', 'test')
  AND t.relname = 'home_automation_credential_lease'
ORDER BY n.nspname ASC, c.relname ASC;

BEGIN;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1790000030000, 1790000000000, 1790000000000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000000000
RETURNING owner_id AS free_acquire_owner_should_be_a;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 1790000031000, 1790000001000, 1790000001000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000001000
RETURNING owner_id AS held_acquire_should_return_no_row;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 1790000070000, 1790000040000, 1790000040000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000040000
RETURNING owner_id AS expired_takeover_owner_should_be_b;
UPDATE test.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = 1790000041000
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
RETURNING owner_id AS wrong_owner_release_should_return_no_row;
UPDATE test.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = 1790000042000
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000003'
RETURNING owner_id AS owner_release_should_return_b;
SELECT lease_expires_at AS expires_after_release_should_be_zero
FROM test.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1790000030000, 1790000000000, 1790000000000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000000000
RETURNING owner_id AS free_acquire_owner_should_be_a;
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 1790000031000, 1790000001000, 1790000001000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000001000
RETURNING owner_id AS held_acquire_should_return_no_row;
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 1790000070000, 1790000040000, 1790000040000)
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= 1790000040000
RETURNING owner_id AS expired_takeover_owner_should_be_b;
UPDATE main.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = 1790000041000
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
RETURNING owner_id AS wrong_owner_release_should_return_no_row;
UPDATE main.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = 1790000042000
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000003'
RETURNING owner_id AS owner_release_should_return_b;
SELECT lease_expires_at AS expires_after_release_should_be_zero
FROM main.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

WITH smoke_ids (id) AS (VALUES ('aaaaaaaa-0000-4000-8000-000000000001'))
SELECT 'test' AS schema_name,
       (SELECT count(*) FROM test.home_automation_credential_lease WHERE integration_account_id IN (SELECT id FROM smoke_ids)) AS leases_should_be_zero
UNION ALL
SELECT 'main',
       (SELECT count(*) FROM main.home_automation_credential_lease WHERE integration_account_id IN (SELECT id FROM smoke_ids));
