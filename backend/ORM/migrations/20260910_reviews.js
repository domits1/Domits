export class Reviews20260910 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test.review (
        id VARCHAR(255) NOT NULL,
        booking_id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        reviewer_user_id VARCHAR(255) NOT NULL,
        reviewee_user_id VARCHAR(255),
        review_type VARCHAR(50) NOT NULL,
        overall_rating NUMERIC(2,1) NOT NULL,
        title VARCHAR(255) NOT NULL,
        public_review TEXT NOT NULL,
        private_feedback TEXT,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_STAY',
        publication_status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ASYNC review_id_unique_test ON test.review (id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC review_booking_type_reviewer_unique_test
      ON test.review (booking_id, review_type, reviewer_user_id);
    `);
    await queryRunner.query(`CREATE INDEX ASYNC review_property_idx_test ON test.review (property_id);`);
    await queryRunner.query(`CREATE INDEX ASYNC review_host_idx_test ON test.review (host_id);`);
    await queryRunner.query(`CREATE INDEX ASYNC review_reviewer_idx_test ON test.review (reviewer_user_id);`);
    await queryRunner.query(`
      CREATE INDEX ASYNC review_public_property_idx_test
      ON test.review (property_id, publication_status, created_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test.review_rating (
        id VARCHAR(255) NOT NULL,
        review_id VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        rating NUMERIC(2,1) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ASYNC review_rating_id_unique_test ON test.review_rating (id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC review_rating_review_category_unique_test
      ON test.review_rating (review_id, category);
    `);
    await queryRunner.query(`CREATE INDEX ASYNC review_rating_review_idx_test ON test.review_rating (review_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.review (
        id VARCHAR(255) NOT NULL,
        booking_id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        reviewer_user_id VARCHAR(255) NOT NULL,
        reviewee_user_id VARCHAR(255),
        review_type VARCHAR(50) NOT NULL,
        overall_rating NUMERIC(2,1) NOT NULL,
        title VARCHAR(255) NOT NULL,
        public_review TEXT NOT NULL,
        private_feedback TEXT,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_STAY',
        publication_status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ASYNC review_id_unique ON main.review (id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC review_booking_type_reviewer_unique
      ON main.review (booking_id, review_type, reviewer_user_id);
    `);
    await queryRunner.query(`CREATE INDEX ASYNC review_property_idx ON main.review (property_id);`);
    await queryRunner.query(`CREATE INDEX ASYNC review_host_idx ON main.review (host_id);`);
    await queryRunner.query(`CREATE INDEX ASYNC review_reviewer_idx ON main.review (reviewer_user_id);`);
    await queryRunner.query(`
      CREATE INDEX ASYNC review_public_property_idx
      ON main.review (property_id, publication_status, created_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.review_rating (
        id VARCHAR(255) NOT NULL,
        review_id VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        rating NUMERIC(2,1) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX ASYNC review_rating_id_unique ON main.review_rating (id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC review_rating_review_category_unique
      ON main.review_rating (review_id, category);
    `);
    await queryRunner.query(`CREATE INDEX ASYNC review_rating_review_idx ON main.review_rating (review_id);`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.review_rating;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.review;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test.review_rating;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test.review;`);
  }
}