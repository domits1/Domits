// Review: Adds the index used to find active host responses for a review.
export class ReviewResponseWorkflow20260915 {
  async up(queryRunner) {
    // Review: Creates a review-response status index in each schema.
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE INDEX ASYNC review_response_review_status_idx_${schema}
        ON ${schema}.review_response (review_id, status, deleted_at);
      `);
    }
  }

  async down(queryRunner) {
    // Review: Removes the review-response status index in each schema.
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_response_review_status_idx_${schema};`);
    }
  }
}
