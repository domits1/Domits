SELECT "integrationAccountId", "domitsPropertyId", COUNT(*) AS in_use_rows
FROM main.channel_integration_property
WHERE status IN ('PROVISIONING', 'ACTIVE', 'active')
GROUP BY "integrationAccountId", "domitsPropertyId"
HAVING COUNT(*) > 1;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.channel_integration_property%'
  AND status IN ('submitted', 'processing');

ALTER TABLE main.channel_integration_property ALTER COLUMN "externalPropertyId" DROP NOT NULL;

SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'channel_integration_property'
  AND column_name = 'externalPropertyId';

UPDATE main.channel_integration_property SET status = 'ARCHIVED' WHERE id = '5f3fc6b0-da85-4ffb-b331-b74c24460099' AND status = 'ACTIVE';

SELECT "integrationAccountId", "domitsPropertyId", COUNT(*) AS in_use_rows
FROM main.channel_integration_property
WHERE status IN ('PROVISIONING', 'ACTIVE', 'active')
GROUP BY "integrationAccountId", "domitsPropertyId"
HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_property_in_use_unique
  ON main.channel_integration_property ("integrationAccountId", "domitsPropertyId")
  WHERE status IN ('PROVISIONING', 'ACTIVE', 'active');

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name = 'main.channel_integration_property_in_use_unique';

SELECT c.relname AS index_name, i.indisunique, i.indisvalid, pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname = 'channel_integration_property'
  AND c.relname = 'channel_integration_property_in_use_unique';

BEGIN;

INSERT INTO main.channel_integration_property
  (id, "integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalPropertyName", status, "createdAt", "updatedAt")
VALUES
  ('smoke-claim-1', 'smoke-account', 'smoke-listing', NULL, NULL, 'PROVISIONING', 1, 1);

INSERT INTO main.channel_integration_property
  (id, "integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalPropertyName", status, "createdAt", "updatedAt")
VALUES
  ('smoke-claim-2', 'smoke-account', 'smoke-listing', NULL, NULL, 'PROVISIONING', 1, 1);

ROLLBACK;

BEGIN;

INSERT INTO main.channel_integration_property
  (id, "integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalPropertyName", status, "createdAt", "updatedAt")
VALUES
  ('smoke-archived', 'smoke-account', 'smoke-listing', 'smoke-old', NULL, 'ARCHIVED', 1, 1);

INSERT INTO main.channel_integration_property
  (id, "integrationAccountId", "domitsPropertyId", "externalPropertyId", "externalPropertyName", status, "createdAt", "updatedAt")
VALUES
  ('smoke-live', 'smoke-account', 'smoke-listing', 'smoke-new', NULL, 'ACTIVE', 1, 1);

SELECT id, status FROM main.channel_integration_property WHERE "integrationAccountId" = 'smoke-account';

ROLLBACK;
