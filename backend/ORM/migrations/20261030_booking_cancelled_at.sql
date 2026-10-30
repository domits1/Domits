SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'cancelled_at'
ORDER BY table_schema ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%booking%'
  AND status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'cancelled_at'
ORDER BY table_schema ASC;

SELECT cancelled_at FROM test.booking LIMIT 1;

SELECT cancelled_at FROM main.booking LIMIT 1;
