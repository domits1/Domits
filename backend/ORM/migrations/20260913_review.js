export class Review20260913 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        ALTER TABLE ${schema}.review
        ALTER COLUMN verification_status SET DEFAULT 'UNVERIFIED';
      `);

      await queryRunner.query(`
        ALTER TABLE ${schema}.review
        ALTER COLUMN publication_status SET DEFAULT 'UNPUBLISHED';
      `);

      await queryRunner.query(`
        INSERT INTO ${schema}.review_category (
          id,
          key,
          label,
          description,
          review_type,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
        VALUES
          ('${schema}-review-category-cleanliness', 'cleanliness', 'Cleanliness', 'How clean the property was.', 'GUEST_TO_PROPERTY', true, 10, 0, 0),
          ('${schema}-review-category-accuracy', 'accuracy', 'Accuracy', 'How accurately the listing represented the stay.', 'GUEST_TO_PROPERTY', true, 20, 0, 0),
          ('${schema}-review-category-communication', 'communication', 'Communication', 'How clear and helpful communication was.', 'GUEST_TO_PROPERTY', true, 30, 0, 0),
          ('${schema}-review-category-location', 'location', 'Location', 'How suitable the property location was.', 'GUEST_TO_PROPERTY', true, 40, 0, 0),
          ('${schema}-review-category-checkin', 'checkIn', 'Check-in', 'How smooth the check-in experience was.', 'GUEST_TO_PROPERTY', true, 50, 0, 0),
          ('${schema}-review-category-value', 'value', 'Value', 'How good the stay felt for the price.', 'GUEST_TO_PROPERTY', true, 60, 0, 0)
        ON CONFLICT (key, review_type) DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at;
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_request_guest_status_idx_${schema}
        ON ${schema}.review_request (guest_id, status);
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_request_booking_idx_${schema}
        ON ${schema}.review_request (booking_id);
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_moderation_status_created_idx_${schema}
        ON ${schema}.review_moderation (status, created_at);
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_verification_booking_idx_${schema}
        ON ${schema}.review_verification (booking_id);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_verification_booking_idx_${schema};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_moderation_status_created_idx_${schema};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_request_booking_idx_${schema};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_request_guest_status_idx_${schema};`);

      await queryRunner.query(`
        DELETE FROM ${schema}.review_category
        WHERE review_type = 'GUEST_TO_PROPERTY'
          AND key IN ('cleanliness', 'accuracy', 'communication', 'location', 'checkIn', 'value');
      `);

      await queryRunner.query(`
        ALTER TABLE ${schema}.review
        ALTER COLUMN verification_status SET DEFAULT 'VERIFIED_STAY';
      `);

      await queryRunner.query(`
        ALTER TABLE ${schema}.review
        ALTER COLUMN publication_status SET DEFAULT 'PUBLISHED';
      `);
    }
  }
}
