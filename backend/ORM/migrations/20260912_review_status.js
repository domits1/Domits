// backend/ORM/migrations/20260912_review_status.js

// Review: Adds a status index so review lists and moderation queues can filter quickly.
export class ReviewStatus20260912 {
  async up(queryRunner) {
    // Review: Creates the status lookup index for each schema.
    await Promise.all(["test", "main"].map(async (schema) => {
      await queryRunner.query(`
        CREATE INDEX review_status_idx_${schema}
        ON ${schema}.review (status);
      `);
    }));
  }

  async down(queryRunner) {
    // Review: Removes the status lookup index for each schema.
    await Promise.all(["main", "test"].map(async (schema) => {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_status_idx_${schema};`);
    }));
  }
}
