SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('total_price_minor', 'refund_requested_amount')
ORDER BY table_schema ASC, column_name ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('total_price_minor', 'refund_requested_amount')
ORDER BY table_schema ASC, column_name ASC;
