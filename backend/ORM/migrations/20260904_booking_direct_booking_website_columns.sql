SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('booking_source', 'site_id', 'guest_email', 'public_booking_ref', 'idempotency_key')
ORDER BY table_schema ASC, column_name ASC;

SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%booking%';

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique_test ON test.booking (public_booking_ref);

CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique_test ON test.booking (idempotency_key);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.booking_%_unique_test'
ORDER BY update_time ASC;

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique ON main.booking (public_booking_ref);

CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique ON main.booking (idempotency_key);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.booking_%_unique'
ORDER BY update_time ASC;

SELECT table_schema, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('booking_source', 'site_id', 'guest_email', 'public_booking_ref', 'idempotency_key')
ORDER BY table_schema ASC, column_name ASC;

SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE t.relname = 'booking'
  AND n.nspname IN ('main', 'test')
  AND c.relname LIKE 'booking_%_unique%'
ORDER BY schema_name ASC, index_name ASC;

SELECT schemaname, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'booking'
  AND schemaname IN ('main', 'test')
  AND indexname LIKE 'booking_%_unique%'
ORDER BY schemaname ASC, indexname ASC;

BEGIN;

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname,
   booking_source, site_id, guest_email, public_booking_ref, idempotency_key)
VALUES
  ('smoke-dbw-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host',
   'STANDALONE_SITE', 'smoke-site', 'guest@example.com', 'dbw-smoke-0001', 'idem-smoke-0001');

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname)
VALUES
  ('smoke-marketplace-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host');

SELECT id, booking_source, site_id, guest_email, public_booking_ref, idempotency_key
FROM test.booking
WHERE id IN ('smoke-dbw-1', 'smoke-marketplace-1')
ORDER BY id ASC;

ROLLBACK;

BEGIN;

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname, idempotency_key)
VALUES
  ('smoke-dup-1', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host', 'idem-smoke-dup');

INSERT INTO test.booking
  (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
   property_id, status, guestname, hostname, idempotency_key)
VALUES
  ('smoke-dup-2', 1791936000000, 1792281600000, 1788912000000, 'smoke-guest', 2, 'smoke-host', FALSE,
   'FAILED: ', 'smoke-property', 'Inquiry', 'Smoke Guest', 'WIP-Host', 'idem-smoke-dup');

ROLLBACK;

DROP INDEX IF EXISTS main.booking_idempotency_key_unique;

DROP INDEX IF EXISTS main.booking_public_booking_ref_unique;

ALTER TABLE main.booking DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE main.booking DROP COLUMN IF EXISTS public_booking_ref;

ALTER TABLE main.booking DROP COLUMN IF EXISTS guest_email;

ALTER TABLE main.booking DROP COLUMN IF EXISTS site_id;

ALTER TABLE main.booking DROP COLUMN IF EXISTS booking_source;

DROP INDEX IF EXISTS test.booking_idempotency_key_unique_test;

DROP INDEX IF EXISTS test.booking_public_booking_ref_unique_test;

ALTER TABLE test.booking DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE test.booking DROP COLUMN IF EXISTS public_booking_ref;

ALTER TABLE test.booking DROP COLUMN IF EXISTS guest_email;

ALTER TABLE test.booking DROP COLUMN IF EXISTS site_id;

ALTER TABLE test.booking DROP COLUMN IF EXISTS booking_source;
