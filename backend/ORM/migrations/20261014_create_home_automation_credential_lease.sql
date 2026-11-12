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

SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS step_0_database_epoch_ms_should_be_current;

BEGIN;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000002'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS free_acquire_owner_should_be_a;
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000003'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS held_acquire_should_return_no_row;
SELECT 1 AS owner_with_margin_should_return_one_row
FROM test.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 1000::bigint
LIMIT 1;
SELECT 1 AS margin_above_remaining_should_return_no_row
FROM test.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 60000::bigint
LIMIT 1;
SELECT 1 AS other_owner_should_return_no_row
FROM test.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000003'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 0::bigint
LIMIT 1;
UPDATE test.home_automation_credential_lease SET lease_expires_at = 0 WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001';
INSERT INTO test.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000003'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS expired_takeover_owner_should_be_b;
UPDATE test.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
RETURNING owner_id AS wrong_owner_release_should_return_no_row;
UPDATE test.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000003'
RETURNING owner_id AS owner_release_should_return_b;
SELECT lease_expires_at AS expires_after_release_should_be_zero
FROM test.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

BEGIN;
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000002'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS free_acquire_owner_should_be_a;
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000003'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS held_acquire_should_return_no_row;
SELECT 1 AS owner_with_margin_should_return_one_row
FROM main.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 1000::bigint
LIMIT 1;
SELECT 1 AS margin_above_remaining_should_return_no_row
FROM main.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 60000::bigint
LIMIT 1;
SELECT 1 AS other_owner_should_return_no_row
FROM main.home_automation_credential_lease
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000003'
  AND lease_expires_at > (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint + 0::bigint
LIMIT 1;
UPDATE main.home_automation_credential_lease SET lease_expires_at = 0 WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001';
INSERT INTO main.home_automation_credential_lease AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::varchar, 'aaaaaaaa-0000-4000-8000-000000000003'::varchar, clock.ms + 30000::bigint, clock.ms, clock.ms
FROM (SELECT (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint AS ms) AS clock
ON CONFLICT (integration_account_id) DO UPDATE
SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
WHERE lease.lease_expires_at <= EXCLUDED.updated_at
RETURNING owner_id AS expired_takeover_owner_should_be_b;
UPDATE main.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint
WHERE integration_account_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  AND owner_id = 'aaaaaaaa-0000-4000-8000-000000000002'
RETURNING owner_id AS wrong_owner_release_should_return_no_row;
UPDATE main.home_automation_credential_lease
SET lease_expires_at = 0, updated_at = (floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint
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
