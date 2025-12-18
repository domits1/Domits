-- Migration: Add calendar management fields to property_availability and property_pricing tables
-- Date: 2025-01-19
-- Description: Add status and note columns for maintenance tracking, and date/price columns for custom pricing

-- ============================================
-- 1. Add status and note columns to property_availability table
-- ============================================

-- Add status column (values: 'blocked', 'maintenance', 'available', or NULL)
ALTER TABLE property_availability
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT NULL;

-- Add note column for maintenance descriptions
ALTER TABLE property_availability
ADD COLUMN IF NOT EXISTS note VARCHAR(500) DEFAULT NULL;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_property_availability_status
ON property_availability(status);

-- Add index on property_id and status combination for common queries
CREATE INDEX IF NOT EXISTS idx_property_availability_property_status
ON property_availability(property_id, status);

-- ============================================
-- 2. Add date and price columns to property_pricing table
-- ============================================

-- Add date column for custom per-date pricing (YYYY-MM-DD format)
ALTER TABLE property_pricing
ADD COLUMN IF NOT EXISTS date VARCHAR(10) DEFAULT NULL;

-- Add price column for custom pricing
ALTER TABLE property_pricing
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT NULL;

-- Add index on property_id and date combination for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_pricing_property_date
ON property_pricing(property_id, date);

-- Add index on date for date-range queries
CREATE INDEX IF NOT EXISTS idx_property_pricing_date
ON property_pricing(date) WHERE date IS NOT NULL;

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON COLUMN property_availability.status IS 'Availability status: blocked, maintenance, or NULL for regular availability';
COMMENT ON COLUMN property_availability.note IS 'Optional note for maintenance dates explaining the reason';

COMMENT ON COLUMN property_pricing.date IS 'Specific date for custom pricing in YYYY-MM-DD format. NULL for base pricing.';
COMMENT ON COLUMN property_pricing.price IS 'Custom price for specific date. Used when date IS NOT NULL.';

-- ============================================
-- 4. Data validation (Optional - uncomment if needed)
-- ============================================

-- Add check constraint to ensure status has valid values (optional)
-- ALTER TABLE property_availability
-- ADD CONSTRAINT chk_property_availability_status
-- CHECK (status IS NULL OR status IN ('blocked', 'maintenance', 'available'));

-- Add check constraint to ensure note is only set when status is maintenance (optional)
-- ALTER TABLE property_availability
-- ADD CONSTRAINT chk_property_availability_note
-- CHECK (note IS NULL OR status = 'maintenance');

-- Add check constraint to ensure date format is correct (optional)
-- ALTER TABLE property_pricing
-- ADD CONSTRAINT chk_property_pricing_date_format
-- CHECK (date IS NULL OR date ~ '^\d{4}-\d{2}-\d{2}$');

-- ============================================
-- 5. Migration verification
-- ============================================

-- Verify property_availability table structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'property_availability'
ORDER BY ordinal_position;

-- Verify property_pricing table structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'property_pricing'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('property_availability', 'property_pricing')
ORDER BY tablename, indexname;
