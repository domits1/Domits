export class CreateReviewFlag20261108 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      const suffix = schema === "test" ? "_test" : "";
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${schema}.review_flag (
        id VARCHAR PRIMARY KEY,
        review_id VARCHAR NOT NULL,
        flagged_by VARCHAR NOT NULL,
        reason VARCHAR NOT NULL,
        notes TEXT,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        resolved_by VARCHAR
      );`);
      await queryRunner.query(`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_flag_pending_unique${suffix}
        ON ${schema}.review_flag (review_id) WHERE status = 'PENDING';`);
      await queryRunner.query(`CREATE INDEX ASYNC IF NOT EXISTS review_flag_queue${suffix}
        ON ${schema}.review_flag (status, created_at, id);`);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_flag;`);
    }
  }
}
