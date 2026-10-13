export class CreateReviews20260930 {
  async up(queryRunner) {
    await this.createSchemaTables(queryRunner, "test");
    await this.createSchemaTables(queryRunner, "main");
  }

  async createSchemaTables(queryRunner, schema) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.review (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        reviewer_user_id VARCHAR(255) NOT NULL,
        reviewee_user_id VARCHAR(255) NULL,
        review_type VARCHAR(50) NOT NULL,
        overall_rating NUMERIC(2, 1) NOT NULL,
        title VARCHAR(255) NOT NULL,
        public_review TEXT NOT NULL,
        private_feedback TEXT NULL,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
        publication_status VARCHAR(50) NOT NULL DEFAULT 'UNPUBLISHED',
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.review_rating (
        id VARCHAR NOT NULL PRIMARY KEY,
        review_id VARCHAR NOT NULL,
        category VARCHAR NOT NULL,
        rating NUMERIC(2, 1) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.review_category (
        id VARCHAR NOT NULL PRIMARY KEY,
        key VARCHAR NOT NULL,
        label VARCHAR NOT NULL,
        description TEXT NULL,
        review_type VARCHAR NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.review_request (
        id VARCHAR NOT NULL PRIMARY KEY,
        booking_id VARCHAR NOT NULL,
        property_id VARCHAR NOT NULL,
        host_id VARCHAR NOT NULL,
        guest_id VARCHAR NOT NULL,
        review_type VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'OPEN',
        requested_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        completed_at BIGINT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        last_sent_at BIGINT NULL,
        next_send_at BIGINT NULL,
        claimed_at BIGINT NULL,
        send_count INTEGER NULL
      );
    `);
    const suffix = schema === "test" ? "_test" : "";
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_booking_type_reviewer_unique${suffix}
      ON ${schema}.review (booking_id, review_type, reviewer_user_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_request_booking_type_guest_unique${suffix}
      ON ${schema}.review_request (booking_id, review_type, guest_id);
    `);
  }

  // Rollback removes review data; run only when these tables can be discarded.
  async down(queryRunner) {
    await this.dropSchemaTables(queryRunner, "main");
    await this.dropSchemaTables(queryRunner, "test");
  }

  async dropSchemaTables(queryRunner, schema) {
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_request;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_rating;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_category;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review;`);
  }
}
