// backend/ORM/migrations/20260912_review_status.js

export class ReviewStatus20260912 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        CREATE INDEX ASYNC review_status_idx_${schema}
        ON ${schema}.review (status);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_status_idx_${schema};`);
    }
  }
}
