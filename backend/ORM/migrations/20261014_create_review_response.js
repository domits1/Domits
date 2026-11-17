export class CreateReviewResponse20261014 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${schema}.review_response (
        id VARCHAR NOT NULL PRIMARY KEY,
        review_id VARCHAR NOT NULL,
        author_id VARCHAR NOT NULL,
        author_role VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'draft',
        message TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        published_at BIGINT NULL,
        deleted_at BIGINT NULL
      );`);
      const suffix = schema === "test" ? "_test" : "";
      await queryRunner.query(`CREATE INDEX ASYNC IF NOT EXISTS review_response_review_id${suffix}
        ON ${schema}.review_response (review_id);`);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_response;`);
    }
  }
}
