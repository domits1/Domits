// Review: Adds the index used to find active host responses for a review.
export class ReviewResponseWorkflow20260915 {
  async up(queryRunner) {
    // Review: Creates a review-response status index in each schema.
    await Promise.all(["test", "main"].map(async (schema) => {
      await queryRunner.query(`
        CREATE INDEX review_response_review_status_idx_${schema}
        ON ${schema}.review_response (review_id, status, deleted_at);
      `);
    }));
  }

  async down(queryRunner) {
    // Review: Removes the review-response status index in each schema.
    await Promise.all(["main", "test"].map(async (schema) => {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_response_review_status_idx_${schema};`);
    }));
  }
}
