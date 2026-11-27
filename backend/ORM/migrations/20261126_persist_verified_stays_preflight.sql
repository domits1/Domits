-- Read-only. In order: test eligible, test excluded, main eligible, main excluded.

SELECT COUNT(*) AS eligible_backfill_count FROM test.review AS review
WHERE review.review_type = 'GUEST_TO_PROPERTY'
  AND review.verification_status IS DISTINCT FROM 'VERIFIED_STAY'
  AND EXISTS (
    SELECT 1 FROM test.booking AS stay
    WHERE stay.id = review.booking_id
      AND stay.guestid = review.reviewer_user_id
      AND stay.property_id = review.property_id
      AND stay.hostid = review.host_id
      AND stay.guestid <> stay.hostid
      AND LOWER(TRIM(stay.status)) IN ('paid', 'confirmed')
      AND stay.departuredate > 0
      AND stay.departuredate <= CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT)
  );

SELECT COALESCE(LOWER(TRIM(stay.status)), 'missing booking') AS booking_status,
 COUNT(*) AS excluded_public_review_count
FROM test.review AS review
LEFT JOIN test.booking AS stay ON stay.id = review.booking_id
WHERE review.review_type = 'GUEST_TO_PROPERTY'
 AND review.status = 'PUBLISHED' AND review.publication_status = 'PUBLISHED'
 AND review.verification_status IS DISTINCT FROM 'VERIFIED_STAY'
 AND NOT EXISTS (
    SELECT 1 FROM test.booking AS stay
    WHERE stay.id = review.booking_id
      AND stay.guestid = review.reviewer_user_id
      AND stay.property_id = review.property_id
      AND stay.hostid = review.host_id
      AND stay.guestid <> stay.hostid
      AND LOWER(TRIM(stay.status)) IN ('paid', 'confirmed')
      AND stay.departuredate > 0
      AND stay.departuredate <= CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT)
 )
GROUP BY COALESCE(LOWER(TRIM(stay.status)), 'missing booking')
ORDER BY booking_status;

SELECT COUNT(*) AS eligible_backfill_count FROM main.review AS review
WHERE review.review_type = 'GUEST_TO_PROPERTY'
  AND review.verification_status IS DISTINCT FROM 'VERIFIED_STAY'
  AND EXISTS (
    SELECT 1 FROM main.booking AS stay
    WHERE stay.id = review.booking_id
      AND stay.guestid = review.reviewer_user_id
      AND stay.property_id = review.property_id
      AND stay.hostid = review.host_id
      AND stay.guestid <> stay.hostid
      AND LOWER(TRIM(stay.status)) IN ('paid', 'confirmed')
      AND stay.departuredate > 0
      AND stay.departuredate <= CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT)
  );

SELECT COALESCE(LOWER(TRIM(stay.status)), 'missing booking') AS booking_status,
 COUNT(*) AS excluded_public_review_count
FROM main.review AS review
LEFT JOIN main.booking AS stay ON stay.id = review.booking_id
WHERE review.review_type = 'GUEST_TO_PROPERTY'
 AND review.status = 'PUBLISHED' AND review.publication_status = 'PUBLISHED'
 AND review.verification_status IS DISTINCT FROM 'VERIFIED_STAY'
 AND NOT EXISTS (
    SELECT 1 FROM main.booking AS stay
    WHERE stay.id = review.booking_id
      AND stay.guestid = review.reviewer_user_id
      AND stay.property_id = review.property_id
      AND stay.hostid = review.host_id
      AND stay.guestid <> stay.hostid
      AND LOWER(TRIM(stay.status)) IN ('paid', 'confirmed')
      AND stay.departuredate > 0
      AND stay.departuredate <= CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT)
 )
GROUP BY COALESCE(LOWER(TRIM(stay.status)), 'missing booking')
ORDER BY booking_status;
