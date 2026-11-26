export class PersistVerifiedStays20261126 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
UPDATE ${schema}.review AS review
SET verification_status = 'VERIFIED_STAY',
    updated_at = GREATEST(review.updated_at + 1, CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT))
WHERE review.review_type = 'GUEST_TO_PROPERTY'
  AND review.verification_status <> 'VERIFIED_STAY'
  AND EXISTS (
    SELECT 1 FROM ${schema}.booking AS stay
    WHERE stay.id = review.booking_id
      AND stay.guestid = review.reviewer_user_id
      AND stay.property_id = review.property_id
      AND stay.hostid = review.host_id
      AND stay.guestid <> stay.hostid
      AND LOWER(TRIM(stay.status)) IN ('paid', 'confirmed')
      AND stay.departuredate > 0
      AND stay.departuredate <= CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT)
  );
      `);
    }
  }

  async down() {
    throw new Error("Stay verification cannot be reversed without discarding historical evidence.");
  }
}
