-- Roll back the application code first. The Booking entity selects these nullable
-- columns on payment reads, so leave them in place until the old code is deployed.
ALTER TABLE main.booking DROP COLUMN IF EXISTS domits_commission_period_start;
ALTER TABLE main.booking DROP COLUMN IF EXISTS domits_commission_annual_revenue_cents;
ALTER TABLE main.booking DROP COLUMN IF EXISTS domits_commission_amount_cents;
ALTER TABLE main.booking DROP COLUMN IF EXISTS domits_commission_rate_bps;
ALTER TABLE main.booking DROP COLUMN IF EXISTS commissionable_amount_cents;
ALTER TABLE main.booking DROP COLUMN IF EXISTS paid_at;

ALTER TABLE test.booking DROP COLUMN IF EXISTS domits_commission_period_start;
ALTER TABLE test.booking DROP COLUMN IF EXISTS domits_commission_annual_revenue_cents;
ALTER TABLE test.booking DROP COLUMN IF EXISTS domits_commission_amount_cents;
ALTER TABLE test.booking DROP COLUMN IF EXISTS domits_commission_rate_bps;
ALTER TABLE test.booking DROP COLUMN IF EXISTS commissionable_amount_cents;
ALTER TABLE test.booking DROP COLUMN IF EXISTS paid_at;
