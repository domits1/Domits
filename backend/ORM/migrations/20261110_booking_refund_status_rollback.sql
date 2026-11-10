-- Roll back the application code and deploy it before dropping this column.
-- The new Booking entity selects refund_status on booking reads.
ALTER TABLE main.booking DROP COLUMN IF EXISTS refund_status;
ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_status;
