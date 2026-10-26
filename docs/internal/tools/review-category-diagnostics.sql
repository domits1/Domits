-- Read-only: inspect the seeded review IDs shown in the database screenshot.
-- Run against the same database/schema used by ReviewSystem.
SELECT current_database(), current_schema();

SELECT r.id AS review_id, r.property_id, r.review_type,
       r.publication_status, r.status,
       rr.category AS stored_category, rr.rating,
       c.key AS matched_category_key, c.label, c.is_active,
       c.review_type AS category_review_type,
       CASE
         WHEN r.id IS NULL THEN 'No parent review'
         WHEN r.publication_status IS DISTINCT FROM 'PUBLISHED' THEN 'Not publicly published'
         WHEN r.status IS DISTINCT FROM 'PUBLISHED' THEN 'Review status is not PUBLISHED'
         WHEN r.review_type IS DISTINCT FROM 'GUEST_TO_PROPERTY' THEN 'Different review type'
         WHEN c.key IS NULL THEN 'No matching active category definition'
         WHEN rr.rating NOT BETWEEN 1 AND 5
           OR rr.rating * 2 <> FLOOR(rr.rating * 2) THEN 'Invalid category rating'
         ELSE 'Eligible: compare property_id with the API request'
       END AS diagnostic
FROM main.review_rating rr
LEFT JOIN main.review r ON r.id = rr.review_id
LEFT JOIN main.review_category c
  ON (LOWER(TRIM(rr.category)) = LOWER(TRIM(c.key))
      OR LOWER(TRIM(rr.category)) = LOWER(TRIM(c.label)))
  AND c.is_active = TRUE AND c.review_type = 'GUEST_TO_PROPERTY'
WHERE rr.review_id IN (
  'c2000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000002'
)
ORDER BY rr.review_id, rr.category;
