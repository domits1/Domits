-- 2026-09-04 booking test-schema reconcile (schema: test)
-- Status: APPLIED and verified on 2026-09-04. test.booking has 19 columns matching
-- main.booking, the LEFT JOIN verification returns no rows, all four columns are
-- nullable, and the smoke test inserted and rolled back cleanly.
-- Purpose:
-- 1) Bring test.booking in line with the Booking entity (backend/ORM/models/Booking.js).
-- 2) Record what the catalog read found so the migration history is honest.
--
-- Findings (catalog read 2026-09-04):
-- - main.booking: 19 columns. test.booking: 15 columns.
-- - 20260520_booking_refund_fields.js claims refunded_amount, stripe_refund_id and
--   refund_error were added to BOTH schemas. test.booking never received them.
-- - total_price exists on main.booking and in the entity (since commit 96a91eb2f,
--   2026-05-28) but has no migration record and is absent from test.booking.
-- - Consequence today: every TypeORM read of Booking with TEST=true fails with
--   "column ... does not exist" because the entity selects every mapped column.
-- - The pre-flight on 2026-09-04 showed column_default NULL for all four columns
--   on main.booking, including refunded_amount. The DEFAULT 0 written in
--   20260520_booking_refund_fields.js was therefore never applied to main either;
--   neither schema has a default on these columns. The entity's default: 0 on
--   refunded_amount and total_price is TypeORM metadata only.
--
-- Aurora DSQL rules that apply to this runbook:
-- - One DDL statement per transaction, and never DDL and DML together. Run each
--   statement on its own in psql autocommit mode. Do NOT wrap the UP block in BEGIN.
-- - ADD COLUMN is a catalog change: no table rewrite, no lock. Columns are added
--   nullable with no DEFAULT (DSQL's ADD COLUMN grammar carries no constraints, and
--   SET NOT NULL is not available on existing tables).
-- - Every DDL commit bumps the cluster-wide catalog version. Sessions holding a
--   stale catalog (including warm Lambdas) fail their next statement with
--   SQLSTATE 40001 / OC001 and succeed on retry. Run in a quiet window, back to
--   back with 20260904_booking_direct_booking_website_columns.sql.

-- =========================
-- Pre-flight (read-only)
-- =========================
-- Expect: the four columns absent from test, present on main.
SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name IN ('refunded_amount', 'stripe_refund_id', 'refund_error', 'total_price')
ORDER BY table_schema, column_name;

-- =========================
-- Migration SQL (UP) - schema test
-- One statement per transaction.
-- =========================
ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refunded_amount BIGINT;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_error TEXT;

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS total_price DOUBLE PRECISION;

-- =========================
-- Default parity - SKIPPED (outcome recorded 2026-09-04)
-- =========================
-- This step existed in case main.booking.refunded_amount carried the DEFAULT 0 from
-- the May migration. The pre-flight showed no column_default on any of the four
-- columns on main, so there was nothing to mirror and no SET DEFAULT was run.
-- test and main now match: all four columns nullable, no defaults, in both schemas.

-- =========================
-- Verification SQL
-- =========================
-- Expect: 19 rows for main and 19 rows for test, same column names.
SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking' AND table_schema IN ('main', 'test')
GROUP BY table_schema
ORDER BY table_schema;

-- Expect: no rows (every main column exists on test).
SELECT m.column_name
FROM information_schema.columns m
LEFT JOIN information_schema.columns t
  ON t.table_schema = 'test' AND t.table_name = 'booking' AND t.column_name = m.column_name
WHERE m.table_schema = 'main' AND m.table_name = 'booking' AND t.column_name IS NULL;

-- Expect: is_nullable = 'YES' for all four on test.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'test' AND table_name = 'booking'
  AND column_name IN ('refunded_amount', 'stripe_refund_id', 'refund_error', 'total_price')
ORDER BY column_name;

-- =========================
-- Rollback SQL (DOWN) - schema test
-- One statement per transaction. DROP COLUMN does not reclaim space and the
-- dropped attribute still counts toward the table's 1600-column lifetime limit.
-- =========================
ALTER TABLE test.booking DROP COLUMN IF EXISTS total_price;

ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_error;

ALTER TABLE test.booking DROP COLUMN IF EXISTS stripe_refund_id;

ALTER TABLE test.booking DROP COLUMN IF EXISTS refunded_amount;

-- =========================
-- Smoke Test SQL - schema test
-- Run in a transaction and ROLLBACK to avoid permanent test rows.
-- DML only; keep it separate from the DDL above.
-- =========================
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
