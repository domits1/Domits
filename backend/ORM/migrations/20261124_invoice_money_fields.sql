SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'invoice'
  AND column_name IN (
    'currency',
    'rate_per_night_minor',
    'gross_amount_minor',
    'commission_amount_minor',
    'net_amount_minor'
  )
ORDER BY column_name ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS rate_per_night_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS gross_amount_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS commission_amount_minor BIGINT;
ALTER TABLE main.invoice ADD COLUMN IF NOT EXISTS net_amount_minor BIGINT;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'invoice'
  AND column_name IN (
    'currency',
    'rate_per_night_minor',
    'gross_amount_minor',
    'commission_amount_minor',
    'net_amount_minor'
  )
ORDER BY column_name ASC;
