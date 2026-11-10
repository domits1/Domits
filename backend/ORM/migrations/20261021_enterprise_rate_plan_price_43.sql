ALTER TABLE main.enterprise_rate_plans
ALTER COLUMN price_per_property_cents SET DEFAULT 4300;

UPDATE main.enterprise_rate_plans
SET price_per_property_cents = 4300,
    updated_at = CURRENT_TIMESTAMP
WHERE price_per_property_cents = 4900
  AND currency = 'EUR'
  AND status = 'ACTIVE'
  AND effective_from <= CURRENT_TIMESTAMP
  AND (effective_until IS NULL OR effective_until >= CURRENT_TIMESTAMP);
