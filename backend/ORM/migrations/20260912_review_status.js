// backend/ORM/migrations/20260912_review_status.js

// Review: Adds a status index so review lists and moderation queues can filter quickly.
export class ReviewStatus20260912 {
  async up(queryRunner) {
    // Review: Creates the status lookup index for each schema.
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE INDEX ASYNC review_status_idx_${schema}
        ON ${schema}.review (status);
      `);
    }
  }

  async down(queryRunner) {
    // Review: Removes the status lookup index for each schema.
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_status_idx_${schema};`);
    }
  }
}
