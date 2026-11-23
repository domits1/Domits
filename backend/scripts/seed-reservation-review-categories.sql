-- Run once per target schema with psql -v review_schema=test (or main) -f <file>.
-- Existing configuration, including disabled categories, takes precedence.
INSERT INTO :"review_schema".review_category
  (id, key, label, review_type, is_active, sort_order, created_at, updated_at)
SELECT 'guest-to-reservation-' || category.key, category.key, category.label,
  'GUEST_TO_RESERVATION', true, category.sort_order, stamp.ms, stamp.ms
FROM (VALUES
  ('booking_experience', 'Booking Experience', 0),
  ('reservation_communication', 'Reservation Communication', 1),
  ('booking_accuracy', 'Booking Accuracy', 2)
) AS category(key, label, sort_order)
CROSS JOIN (SELECT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::bigint AS ms) AS stamp
WHERE NOT EXISTS (
  SELECT 1 FROM :"review_schema".review_category AS existing
  WHERE existing.review_type = 'GUEST_TO_RESERVATION' AND existing.key = category.key
)
ON CONFLICT (id) DO NOTHING;
