-- 2026-10-14 cancellation policy: rename the legacy "Strict" choice to "Limited" (#832)
-- Context:
--   Before #832 the host option labelled "Limited (Cancel up to 14 days before)" was saved as
--   CancellationPolicy:Strict, and bookings snapshotted that choice as 'Strict'. Guests were shown
--   the 14-day Limited terms. #832 adds a real 90-day Strict policy, so every legacy 'Strict'
--   must become 'Limited' or those hosts and bookings silently move to the 90-day terms.
--
-- Run order: run this BEFORE the #832 code is deployed, in every environment.
--   After the deploy, a host can choose the new 90-day Strict and the two meanings can no longer
--   be told apart. The precondition below returns 0 only while that has not happened yet.

-- =========================
-- Precondition (must return 0 before running UP)
-- =========================
-- CancellationPolicy:Limited only exists once the #832 code is live.
SELECT COUNT(*) AS limited_rows_already_present
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Limited';

-- Rows the migration will touch, keep these numbers for the verification step:
SELECT COUNT(*) AS legacy_strict_property_rules
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Strict';

SELECT COUNT(*) AS legacy_strict_bookings_main
FROM main.booking
WHERE LOWER(cancellation_policy) = 'strict';

SELECT COUNT(*) AS legacy_strict_bookings_test
FROM test.booking
WHERE LOWER(cancellation_policy) = 'strict';

-- =========================
-- Migration SQL (UP)
-- =========================
-- (property_id, rule) is the primary key, so the rule is moved with insert + delete in one
-- transaction. A plain INSERT fails on a conflicting Limited row instead of overwriting it.
BEGIN;

INSERT INTO main.property_rule (property_id, rule, value, value_new)
SELECT property_id, 'CancellationPolicy:Limited', value, value_new
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Strict';

DELETE FROM main.property_rule
WHERE rule = 'CancellationPolicy:Strict';

COMMIT;

UPDATE main.booking
SET cancellation_policy = 'Limited'
WHERE LOWER(cancellation_policy) = 'strict';

UPDATE test.booking
SET cancellation_policy = 'Limited'
WHERE LOWER(cancellation_policy) = 'strict';

-- =========================
-- Verification SQL
-- =========================
-- Expect 0 legacy rows left:
SELECT COUNT(*) AS strict_property_rules_left
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Strict';

-- Expect the legacy_strict_property_rules count from the precondition step:
SELECT COUNT(*) AS limited_property_rules
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Limited';

-- Expect no rows: at most one active cancellation policy per property.
SELECT property_id, COUNT(*) AS active_policies
FROM main.property_rule
WHERE rule LIKE 'CancellationPolicy:%'
  AND value = TRUE
GROUP BY property_id
HAVING COUNT(*) > 1;

-- Expect 0 legacy bookings left:
SELECT
  (SELECT COUNT(*) FROM main.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_left_main,
  (SELECT COUNT(*) FROM test.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_left_test;

-- =========================
-- Rollback SQL (DOWN)
-- =========================
-- Only correct while the #832 code is not deployed: afterwards a 'Limited' row can be a real
-- Limited choice, and a 'Strict' row a real 90-day choice.
-- BEGIN;
--
-- INSERT INTO main.property_rule (property_id, rule, value, value_new)
-- SELECT property_id, 'CancellationPolicy:Strict', value, value_new
-- FROM main.property_rule
-- WHERE rule = 'CancellationPolicy:Limited';
--
-- DELETE FROM main.property_rule
-- WHERE rule = 'CancellationPolicy:Limited';
--
-- COMMIT;
--
-- UPDATE main.booking SET cancellation_policy = 'Strict' WHERE cancellation_policy = 'Limited';
-- UPDATE test.booking SET cancellation_policy = 'Strict' WHERE cancellation_policy = 'Limited';
