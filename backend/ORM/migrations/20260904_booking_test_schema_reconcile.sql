SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('refunded_amount', 'stripe_refund_id', 'refund_error', 'total_price')
ORDER BY table_schema ASC, column_name ASC;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refunded_amount BIGINT;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_error TEXT;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS total_price DOUBLE PRECISION;

SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema ASC;

SELECT m.column_name
FROM information_schema.columns m
LEFT JOIN information_schema.columns t
  ON t.table_schema = 'test' AND t.table_name = 'booking' AND t.column_name = m.column_name
WHERE m.table_schema = 'main' AND m.table_name = 'booking' AND t.column_name IS NULL;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'test' AND table_name = 'booking'
  AND column_name IN ('refunded_amount', 'stripe_refund_id', 'refund_error', 'total_price')
ORDER BY column_name ASC;

BEGIN;

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname,
   refunded_amount, stripe_refund_id, refund_error, total_price)
VALUES
  ('smoke-reconcile-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host',
   0, NULL, NULL, 810.00);

SELECT id, refunded_amount, stripe_refund_id, refund_error, total_price
FROM test.booking
WHERE id = 'smoke-reconcile-1';

ROLLBACK;

ALTER TABLE test.booking DROP COLUMN IF EXISTS total_price;

ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_error;

ALTER TABLE test.booking DROP COLUMN IF EXISTS stripe_refund_id;

ALTER TABLE test.booking DROP COLUMN IF EXISTS refunded_amount;
