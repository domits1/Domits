-- 2026-09-04 booking direct booking website columns (schemas: test, main)
-- Purpose:
-- 1) Add the columns a booking request from a direct booking website needs:
--    booking_source, site_id, guest_email, public_booking_ref, idempotency_key.
-- 2) Enforce uniqueness of public_booking_ref and idempotency_key.
--
-- Column semantics (all nullable; NULL means "marketplace booking, unchanged"):
-- - booking_source     VARCHAR(255)  'STANDALONE_SITE' for direct booking website requests.
--                                    255 rather than an enum-sized width for the same
--                                    reason as public_booking_ref below.
-- - site_id            VARCHAR(255)  standalone_site.id the request came from.
-- - guest_email        VARCHAR(255)  contact for anonymous guests (no Cognito guestid).
-- - public_booking_ref VARCHAR(255)  public-safe reference returned to the guest.
--                                    Width matches the other varchars: DSQL has no
--                                    ALTER COLUMN TYPE, so widening later would mean
--                                    dropping and recreating the column. The ref
--                                    format is decided in PR 5.
-- - idempotency_key    VARCHAR(255)  client-supplied Idempotency-Key header value.
--
-- Prerequisite: 20260904_booking_test_schema_reconcile.sql applied first, so that
-- test.booking matches the entity before it gains new columns.
--
-- Aurora DSQL rules that apply to this runbook:
-- - One DDL statement per transaction, never DDL and DML together. Run each
--   statement on its own in psql autocommit mode. Do NOT wrap blocks in BEGIN.
-- - ADD COLUMN is a catalog change: no rewrite, no lock. Columns are nullable with
--   no DEFAULT and no NOT NULL (DSQL cannot SET NOT NULL on an existing table).
-- - Uniqueness is a CREATE UNIQUE INDEX ASYNC. It returns a job_id immediately and
--   does not block the table. Monitor sys.jobs; wait with sys.wait_for_job.
--   If a build fails, the index stays INVALID and STILL enforces uniqueness on
--   writes until dropped. Drop it, fix the data, create it again.
-- - NULLS DISTINCT is the default and is required here: every existing marketplace
--   row has NULL in both new key columns. Never add NULLS NOT DISTINCT.
-- - Each DDL commit and each index activation bumps the cluster-wide catalog
--   version; sessions with a stale catalog (warm Lambdas) fail once with
--   SQLSTATE 40001 / OC001 and succeed on retry. Run in a quiet window.
-- - Limits checked: booking has 19 active columns (limit 255, 24 after this),
--   2 indexes on main (limit 24, 4 after this), index keys are single
--   VARCHAR(255) columns (limit 1 KiB), no backfill (3000-row transaction limit
--   does not apply).
--
-- Order of operations for the whole change:
-- 1) Pre-flight below, both schemas.
-- 2) UP on test, wait for both index jobs, verify.
-- 3) UP on main, wait for both index jobs, verify.
-- 4) Smoke test on test (and on main only if the team agrees; it rolls back).
-- 5) Only then merge the PR that changes backend/ORM/models/Booking.js; the merge
--    triggers a global Lambda redeploy and every Booking read selects the new
--    columns from that moment on.

-- =========================
-- Pre-flight (read-only)
-- =========================
-- Expect: no rows in either schema.
SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('booking_source', 'site_id', 'guest_email', 'public_booking_ref', 'idempotency_key')
ORDER BY table_schema, column_name;

-- Expect: test and main both report 19 columns (reconcile applied).
SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema;

-- Expect: no in-flight jobs on booking before starting.
SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%booking%';

-- =========================
-- Migration SQL (UP) - schema test
-- One statement per transaction.
-- =========================
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Each CREATE INDEX ASYNC prints a job_id. Wait for each before continuing.
CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique_test ON test.booking (public_booking_ref);
-- SELECT sys.wait_for_job('<job_id printed above>');

CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique_test ON test.booking (idempotency_key);
-- SELECT sys.wait_for_job('<job_id printed above>');

-- =========================
-- Migration SQL (UP) - schema main
-- One statement per transaction. Quiet window.
-- =========================
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);

ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique ON main.booking (public_booking_ref);
-- SELECT sys.wait_for_job('<job_id printed above>');

CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique ON main.booking (idempotency_key);
-- SELECT sys.wait_for_job('<job_id printed above>');

-- =========================
-- Verification SQL
-- =========================
-- Expect: 5 rows per schema, all is_nullable = 'YES', column_default NULL.
SELECT table_schema, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('booking_source', 'site_id', 'guest_email', 'public_booking_ref', 'idempotency_key')
ORDER BY table_schema, column_name;

-- Expect: both index jobs per schema with status = 'completed'
-- (sys.jobs forgets finished jobs after ~30 minutes; run this soon after).
SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE '%booking_public_booking_ref_unique%'
   OR object_name LIKE '%booking_idempotency_key_unique%'
ORDER BY update_time;

-- Expect: indisunique = t and indisvalid = t for all four indexes.
SELECT n.nspname AS schema_name, c.relname AS index_name, i.indisunique, i.indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE t.relname = 'booking'
  AND n.nspname IN ('main', 'test')
  AND c.relname LIKE 'booking_%_unique%'
ORDER BY schema_name, index_name;

-- Expect: the index definitions with no NULLS NOT DISTINCT clause.
SELECT schemaname, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'booking'
  AND schemaname IN ('main', 'test')
  AND indexname LIKE 'booking_%_unique%'
ORDER BY schemaname, indexname;

-- =========================
-- Rollback SQL (DOWN) - reverse order, one statement per transaction
-- DROP INDEX also cancels an in-progress build. DROP COLUMN does not reclaim
-- space and the dropped attribute still counts toward the 1600-column lifetime limit.
-- =========================
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

-- =========================
-- Smoke Test SQL - schema test
-- DML only, after the index jobs report completed.
-- =========================

-- 1) A direct booking website request row round-trips, and an ordinary
--    marketplace row with NULL in every new column coexists with it.
--    Run in a transaction and ROLLBACK to avoid permanent test rows.
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
ORDER BY id;

ROLLBACK;

-- 2) Uniqueness is enforced: the second INSERT must fail with a duplicate key
--    error on booking_idempotency_key_unique_test. The transaction is then
--    aborted; ROLLBACK ends it.
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
