SELECT "userId", channel, COUNT(*) AS rows_for_user
FROM main.channel_integration_account
WHERE channel = 'CHANNEX'
GROUP BY "userId", channel
HAVING COUNT(*) > 1;

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.channel_integration_account%'
  AND status IN ('submitted', 'processing');

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_account_channex_user_unique
  ON main.channel_integration_account ("userId", channel)
  WHERE channel = 'CHANNEX';

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name = 'main.channel_integration_account_channex_user_unique';

SELECT c.relname AS index_name, i.indisunique, i.indisvalid, pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'main'
  AND t.relname = 'channel_integration_account'
  AND c.relname = 'channel_integration_account_channex_user_unique';

BEGIN;

INSERT INTO main.channel_integration_account
  (id, "userId", channel, status, "createdAt", "updatedAt")
VALUES
  ('smoke-account-1', 'smoke-host', 'CHANNEX', 'CONNECTED', 1, 1);

INSERT INTO main.channel_integration_account
  (id, "userId", channel, status, "createdAt", "updatedAt")
VALUES
  ('smoke-account-2', 'smoke-host', 'CHANNEX', 'CONNECTED', 1, 1);

ROLLBACK;
