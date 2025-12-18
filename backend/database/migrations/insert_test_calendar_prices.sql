-- Test Data: Insert sample calendar prices
-- Date: 2025-12-10
-- Description: Insert test data into property_calendar_price table

-- ============================================
-- 1. Insert test data for property calendar prices
-- ============================================

-- Note: Replace 'YOUR_PROPERTY_ID' with an actual property_id from your property table
-- Dates are stored as Unix timestamps in milliseconds

-- Example: Setting prices for dates in January 2026
-- Date: 2026-01-15 -> Timestamp: 1768521600000 (milliseconds)
-- Date: 2026-01-16 -> Timestamp: 1768608000000
-- Date: 2026-01-17 -> Timestamp: 1768694400000

-- First, let's see available properties
SELECT id, title FROM main.property LIMIT 5;

-- Insert sample calendar prices (update property_id with actual values)
-- Format: property_id, date (Unix timestamp in ms), price (in cents)

INSERT INTO main.property_calendar_price (property_id, date, price)
VALUES
  -- January 15, 2026 - Price: $150.00
  ('YOUR_PROPERTY_ID', 1768521600000, 15000),

  -- January 16, 2026 - Price: $175.00
  ('YOUR_PROPERTY_ID', 1768608000000, 17500),

  -- January 17, 2026 - Price: $200.00
  ('YOUR_PROPERTY_ID', 1768694400000, 20000),

  -- January 18, 2026 - Price: $180.00
  ('YOUR_PROPERTY_ID', 1768780800000, 18000),

  -- January 19, 2026 - Price: $160.00
  ('YOUR_PROPERTY_ID', 1768867200000, 16000)
ON CONFLICT (property_id, date)
DO UPDATE SET price = EXCLUDED.price;

-- ============================================
-- 2. Helper: Convert date string to timestamp
-- ============================================

-- If you want to insert using date strings, use this function:
-- SELECT EXTRACT(EPOCH FROM '2026-01-15'::timestamp) * 1000;

-- Example with dynamic date conversion:
-- INSERT INTO main.property_calendar_price (property_id, date, price)
-- VALUES (
--   'YOUR_PROPERTY_ID',
--   (EXTRACT(EPOCH FROM '2026-01-20'::timestamp) * 1000)::bigint,
--   22000
-- );

-- ============================================
-- 3. Verify inserted data
-- ============================================

-- View all calendar prices
SELECT
  property_id,
  date,
  TO_TIMESTAMP(date / 1000) AT TIME ZONE 'UTC' as readable_date,
  price,
  price / 100.0 as price_in_dollars
FROM main.property_calendar_price
ORDER BY property_id, date;

-- ============================================
-- 4. Query by property_id
-- ============================================

-- Replace 'YOUR_PROPERTY_ID' with actual property_id
SELECT
  property_id,
  TO_TIMESTAMP(date / 1000) AT TIME ZONE 'UTC' as date_readable,
  TO_CHAR(TO_TIMESTAMP(date / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date_string,
  price,
  CONCAT('$', (price / 100.0)::numeric(10,2)) as formatted_price
FROM main.property_calendar_price
WHERE property_id = 'YOUR_PROPERTY_ID'
ORDER BY date;

-- ============================================
-- 5. Bulk insert helper - Generate prices for a date range
-- ============================================

-- Example: Insert prices for all days in January 2026 with $150 base price
-- DO $$
-- DECLARE
--   start_date DATE := '2026-01-01';
--   end_date DATE := '2026-01-31';
--   current_date DATE := start_date;
--   property_id_var VARCHAR := 'YOUR_PROPERTY_ID';
--   base_price INT := 15000; -- $150.00
-- BEGIN
--   WHILE current_date <= end_date LOOP
--     INSERT INTO main.property_calendar_price (property_id, date, price)
--     VALUES (
--       property_id_var,
--       (EXTRACT(EPOCH FROM current_date::timestamp) * 1000)::bigint,
--       base_price
--     )
--     ON CONFLICT (property_id, date) DO NOTHING;
--
--     current_date := current_date + INTERVAL '1 day';
--   END LOOP;
-- END $$;

-- ============================================
-- 6. Delete test data (cleanup)
-- ============================================

-- To remove all test data:
-- DELETE FROM main.property_calendar_price WHERE property_id = 'YOUR_PROPERTY_ID';
