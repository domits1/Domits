-- Migration: Create property_calendar_price table
-- Date: 2025-12-10
-- Description: Create dedicated table for storing daily custom pricing for properties

-- ============================================
-- 1. Create property_calendar_price table
-- ============================================

DROP TABLE IF EXISTS main.property_calendar_price;

CREATE TABLE IF NOT EXISTS main.property_calendar_price (
  property_id VARCHAR(255) NOT NULL,
  date BIGINT NOT NULL,
  price INTEGER NOT NULL,
  PRIMARY KEY (property_id, date),
  CONSTRAINT fk_property_calendar_price_property
    FOREIGN KEY (property_id)
    REFERENCES main.property (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================

-- Index on property_id for faster lookups by property
CREATE INDEX IF NOT EXISTS idx_property_calendar_price_property
ON main.property_calendar_price(property_id);

-- Index on date for date-range queries
CREATE INDEX IF NOT EXISTS idx_property_calendar_price_date
ON main.property_calendar_price(date);

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON TABLE main.property_calendar_price IS 'Stores daily custom pricing for properties. Date is stored as Unix timestamp in milliseconds (bigint).';
COMMENT ON COLUMN main.property_calendar_price.property_id IS 'Foreign key reference to property.id';
COMMENT ON COLUMN main.property_calendar_price.date IS 'Unix timestamp in milliseconds representing the date (stored as bigint for consistency with other date fields)';
COMMENT ON COLUMN main.property_calendar_price.price IS 'Custom price for this specific date in cents (e.g., 15000 = $150.00)';

-- ============================================
-- 4. Migration verification
-- ============================================

-- Verify table structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'property_calendar_price'
ORDER BY ordinal_position;

-- Verify indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'main'
  AND tablename = 'property_calendar_price'
ORDER BY indexname;

-- Verify foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'main'
  AND tc.table_name = 'property_calendar_price';
