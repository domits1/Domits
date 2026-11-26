UPDATE test.review AS review
SET verification_status = 'VERIFIED_STAY',
    updated_at = GREATEST(review.updated_at + 1, CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT))
WHERE review.review_type = 'GUEST_TO_PROPERTY'
  AND review.verification_status <> 'VERIFIED_STAY'
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

UPDATE main.review AS review
SET verification_status = 'VERIFIED_STAY',
    updated_at = GREATEST(review.updated_at + 1, CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT))
WHERE review.review_type = 'GUEST_TO_PROPERTY'
  AND review.verification_status <> 'VERIFIED_STAY'
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
