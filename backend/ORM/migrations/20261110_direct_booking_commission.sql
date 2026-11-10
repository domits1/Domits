SELECT table_schema, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN (
    'commissionable_accommodation_cents',
    'commission_rate',
    'commission_amount_cents',
    'commission_annual_revenue_cents',
    'commission_year'
  )
ORDER BY table_schema ASC, column_name ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commissionable_accommodation_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 4);
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commission_amount_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commission_annual_revenue_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commission_year INTEGER;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commissionable_accommodation_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 4);
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commission_amount_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commission_annual_revenue_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commission_year INTEGER;

SELECT table_schema, column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN (
    'commissionable_accommodation_cents',
    'commission_rate',
    'commission_amount_cents',
    'commission_annual_revenue_cents',
    'commission_year'
  )
ORDER BY table_schema ASC, column_name ASC;

SELECT commissionable_accommodation_cents, commission_rate, commission_amount_cents,
       commission_annual_revenue_cents, commission_year
FROM test.booking
LIMIT 1;

SELECT commissionable_accommodation_cents, commission_rate, commission_amount_cents,
       commission_annual_revenue_cents, commission_year
FROM main.booking
LIMIT 1;
