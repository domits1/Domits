SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property'
  AND column_name IN ('enterpriseid', 'is_deleted')
ORDER BY column_name ASC;

ALTER TABLE main.property
ADD COLUMN IF NOT EXISTS enterpriseid VARCHAR(255);

ALTER TABLE main.property
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

UPDATE main.property
SET is_deleted = FALSE
WHERE is_deleted IS NULL;

CREATE TABLE IF NOT EXISTS main.enterprise_rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id VARCHAR(255) NOT NULL,
    price_per_property_cents INTEGER NOT NULL DEFAULT 4900,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ASYNC idx_enterprise_rate_plans_enterprise_id
ON main.enterprise_rate_plans (enterprise_id);

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND (
      (table_name = 'property' AND column_name IN ('enterpriseid', 'is_deleted'))
      OR table_name = 'enterprise_rate_plans'
  )
ORDER BY table_name, ordinal_position;

SELECT COUNT(*) AS rows_with_null_is_deleted
FROM main.property
WHERE is_deleted IS NULL;
