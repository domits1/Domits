export class ReviewResponseWorkflow20260915 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE INDEX ASYNC review_response_review_status_idx_${schema}
        ON ${schema}.review_response (review_id, status, deleted_at);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_response_review_status_idx_${schema};`);
    }
  }
}
