INSERT INTO main.property_rule (property_id, rule, value, value_new)
SELECT limited_rule.property_id, 'CancellationPolicy:Strict', limited_rule.value, limited_rule.value_new
FROM main.property_rule AS limited_rule
WHERE limited_rule.rule = 'CancellationPolicy:Limited'
  AND NOT EXISTS (
    SELECT 1
    FROM main.property_rule AS strict_rule
    WHERE strict_rule.property_id = limited_rule.property_id
      AND strict_rule.rule = 'CancellationPolicy:Strict'
  )
LIMIT 1000;

DELETE FROM main.property_rule
WHERE rule = 'CancellationPolicy:Limited'
  AND property_id IN (
    SELECT strict_rule.property_id
    FROM main.property_rule AS strict_rule
    WHERE strict_rule.rule = 'CancellationPolicy:Strict'
      AND EXISTS (
        SELECT 1
        FROM main.property_rule AS limited_rule
        WHERE limited_rule.property_id = strict_rule.property_id
          AND limited_rule.rule = 'CancellationPolicy:Limited'
      )
    LIMIT 1000
  );

UPDATE main.booking
SET cancellation_policy = 'Strict'
WHERE id IN (
  SELECT id FROM main.booking WHERE cancellation_policy = 'Limited' LIMIT 1000
);

UPDATE test.booking
SET cancellation_policy = 'Strict'
WHERE id IN (
  SELECT id FROM test.booking WHERE cancellation_policy = 'Limited' LIMIT 1000
);
