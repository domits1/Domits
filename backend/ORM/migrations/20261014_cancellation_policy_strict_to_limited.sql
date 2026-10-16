SELECT COUNT(*) AS limited_rows_already_present
FROM main.property_rule
WHERE rule = 'CancellationPolicy:Limited';

SELECT
  (SELECT COUNT(*) FROM main.property_rule WHERE rule = 'CancellationPolicy:Strict') AS strict_property_rules,
  (SELECT COUNT(*) FROM main.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_main,
  (SELECT COUNT(*) FROM test.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_test;

INSERT INTO main.property_rule (property_id, rule, value, value_new)
SELECT strict_rule.property_id, 'CancellationPolicy:Limited', strict_rule.value, strict_rule.value_new
FROM main.property_rule AS strict_rule
WHERE strict_rule.rule = 'CancellationPolicy:Strict'
  AND NOT EXISTS (
    SELECT 1
    FROM main.property_rule AS limited_rule
    WHERE limited_rule.property_id = strict_rule.property_id
      AND limited_rule.rule = 'CancellationPolicy:Limited'
  )
LIMIT 1000;

DELETE FROM main.property_rule
WHERE rule = 'CancellationPolicy:Strict'
  AND property_id IN (
    SELECT limited_rule.property_id
    FROM main.property_rule AS limited_rule
    WHERE limited_rule.rule = 'CancellationPolicy:Limited'
      AND EXISTS (
        SELECT 1
        FROM main.property_rule AS strict_rule
        WHERE strict_rule.property_id = limited_rule.property_id
          AND strict_rule.rule = 'CancellationPolicy:Strict'
      )
    LIMIT 1000
  );

UPDATE main.booking
SET cancellation_policy = 'Limited'
WHERE id IN (
  SELECT id FROM main.booking WHERE LOWER(cancellation_policy) = 'strict' LIMIT 1000
);

UPDATE test.booking
SET cancellation_policy = 'Limited'
WHERE id IN (
  SELECT id FROM test.booking WHERE LOWER(cancellation_policy) = 'strict' LIMIT 1000
);

SELECT
  (SELECT COUNT(*) FROM main.property_rule WHERE rule = 'CancellationPolicy:Strict') AS strict_property_rules_left,
  (SELECT COUNT(*) FROM main.property_rule WHERE rule = 'CancellationPolicy:Limited') AS limited_property_rules,
  (SELECT COUNT(*) FROM main.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_left_main,
  (SELECT COUNT(*) FROM test.booking WHERE LOWER(cancellation_policy) = 'strict') AS strict_bookings_left_test;

SELECT property_id, COUNT(*) AS active_policies
FROM main.property_rule
WHERE rule LIKE 'CancellationPolicy:%'
  AND value = TRUE
GROUP BY property_id
HAVING COUNT(*) > 1;
