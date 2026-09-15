export class ReviewsEntities20260911 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_category (
          id VARCHAR(255) NOT NULL,
          key VARCHAR(100) NOT NULL,
          label VARCHAR(255) NOT NULL,
          description TEXT,
          review_type VARCHAR(50) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INT NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC review_category_key_type_unique_${schema}
        ON ${schema}.review_category (key, review_type);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_request (
          id VARCHAR(255) NOT NULL,
          booking_id VARCHAR(255) NOT NULL,
          property_id VARCHAR(255) NOT NULL,
          host_id VARCHAR(255) NOT NULL,
          guest_id VARCHAR(255) NOT NULL,
          review_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
          requested_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          completed_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC review_request_booking_type_guest_unique_${schema}
        ON ${schema}.review_request (booking_id, review_type, guest_id);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_response (
          id VARCHAR(255) NOT NULL,
          review_id VARCHAR(255) NOT NULL,
          responder_user_id VARCHAR(255) NOT NULL,
          public_response TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC review_response_review_unique_${schema}
        ON ${schema}.review_response (review_id);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_moderation (
          id VARCHAR(255) NOT NULL,
          review_id VARCHAR(255) NOT NULL,
          target_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          reason VARCHAR(255),
          notes TEXT,
          moderated_by_user_id VARCHAR(255),
          moderated_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_moderation_review_idx_${schema}
        ON ${schema}.review_moderation (review_id);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_verification (
          id VARCHAR(255) NOT NULL,
          review_id VARCHAR(255) NOT NULL,
          booking_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_STAY',
          method VARCHAR(50) NOT NULL DEFAULT 'BOOKING_MATCH',
          evidence_json TEXT,
          verified_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          PRIMARY KEY (id)
        );
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC review_verification_review_unique_${schema}
        ON ${schema}.review_verification (review_id);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_verification;`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_moderation;`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_response;`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_request;`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_category;`);
    }
  }
}