SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN (
    'paid_at',
    'commissionable_amount_cents',
    'domits_commission_rate_bps',
    'domits_commission_amount_cents',
    'domits_commission_annual_revenue_cents',
    'domits_commission_period_start'
  )
ORDER BY table_schema ASC, column_name ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS paid_at BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS commissionable_amount_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS domits_commission_rate_bps INTEGER;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS domits_commission_amount_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS domits_commission_annual_revenue_cents BIGINT;
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS domits_commission_period_start BIGINT;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS paid_at BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS commissionable_amount_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS domits_commission_rate_bps INTEGER;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS domits_commission_amount_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS domits_commission_annual_revenue_cents BIGINT;
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS domits_commission_period_start BIGINT;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN (
    'paid_at',
    'commissionable_amount_cents',
    'domits_commission_rate_bps',
    'domits_commission_amount_cents',
    'domits_commission_annual_revenue_cents',
    'domits_commission_period_start'
  )
ORDER BY table_schema ASC, column_name ASC;
