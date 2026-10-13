SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'special_request'
ORDER BY table_schema ASC;

SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%booking%'
  AND status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS special_request TEXT;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS special_request TEXT;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'special_request'
ORDER BY table_schema ASC;

SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema ASC;

BEGIN;

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname, special_request)
VALUES
  ('smoke-sr-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host', 'Late check-in around 9pm, please');

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname)
VALUES
  ('smoke-sr-2', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host');

UPDATE test.booking SET special_request = 'Extra pillows, please' WHERE id = 'smoke-sr-2';

SELECT id, special_request
FROM test.booking
WHERE id IN ('smoke-sr-1', 'smoke-sr-2')
ORDER BY id ASC;

ROLLBACK;

BEGIN;

INSERT INTO main.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname, special_request)
VALUES
  ('smoke-sr-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host', 'Late check-in around 9pm, please');

INSERT INTO main.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname)
VALUES
  ('smoke-sr-2', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host');

UPDATE main.booking SET special_request = 'Extra pillows, please' WHERE id = 'smoke-sr-2';

SELECT id, special_request
FROM main.booking
WHERE id IN ('smoke-sr-1', 'smoke-sr-2')
ORDER BY id ASC;

ROLLBACK;

SELECT 'test' AS schema_name, COUNT(*) AS should_be_zero FROM test.booking WHERE id LIKE 'smoke-sr-%'
UNION ALL
SELECT 'main' AS schema_name, COUNT(*) AS should_be_zero FROM main.booking WHERE id LIKE 'smoke-sr-%';

ALTER TABLE main.booking DROP COLUMN IF EXISTS special_request;

ALTER TABLE test.booking DROP COLUMN IF EXISTS special_request;
