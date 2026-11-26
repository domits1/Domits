-- Roll the application code back first. Dropping these columns after deploying an
-- older entity is only necessary when a full schema rollback is required.
ALTER TABLE main.booking DROP COLUMN IF EXISTS refund_requested_amount;
ALTER TABLE main.booking DROP COLUMN IF EXISTS total_price_minor;
ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_requested_amount;
ALTER TABLE test.booking DROP COLUMN IF EXISTS total_price_minor;
