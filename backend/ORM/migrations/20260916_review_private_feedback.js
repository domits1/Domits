// Review: Adds the Domits-only private feedback table and lookup indexes.
export class ReviewPrivateFeedback20260916 {
  async up(queryRunner) {
    // Review: Creates private review feedback storage for each schema.
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.review_private_feedback (
          id VARCHAR(255) PRIMARY KEY,
          review_id VARCHAR(255) NOT NULL,
          reservation_id VARCHAR(255) NOT NULL,
          guest_id VARCHAR(255) NOT NULL,
          property_id VARCHAR(255) NOT NULL,
          feedback_type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_private_feedback_review_idx_${schema}
        ON ${schema}.review_private_feedback (review_id, feedback_type);
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_private_feedback_property_idx_${schema}
        ON ${schema}.review_private_feedback (property_id, feedback_type);
      `);
    }
  }

  async down(queryRunner) {
    // Review: Removes private feedback indexes and storage for each schema.
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_private_feedback_property_idx_${schema};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_private_feedback_review_idx_${schema};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_private_feedback;`);
    }
  }
}
