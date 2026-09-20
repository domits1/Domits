export class ReviewResponseWorkflow20260915 {
  async up(queryRunner) {
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`
        ALTER TABLE ${schema}.review_response
        ADD COLUMN IF NOT EXISTS author_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS author_role VARCHAR(100),
        ADD COLUMN IF NOT EXISTS message TEXT,
        ADD COLUMN IF NOT EXISTS published_at BIGINT,
        ADD COLUMN IF NOT EXISTS deleted_at BIGINT;
      `);

      await queryRunner.query(`
        UPDATE ${schema}.review_response
        SET
          author_id = COALESCE(author_id, responder_user_id),
          author_role = COALESCE(author_role, 'host'),
          message = COALESCE(message, public_response),
          status = CASE
            WHEN LOWER(status) = 'published' THEN 'published'
            ELSE 'draft'
          END,
          published_at = CASE
            WHEN LOWER(status) = 'published' THEN COALESCE(published_at, updated_at)
            ELSE published_at
          END
        WHERE author_id IS NULL
           OR author_role IS NULL
           OR message IS NULL
           OR status IN ('SUBMITTED', 'PUBLISHED', 'DRAFT');
      `);

      await queryRunner.query(`
        ALTER TABLE ${schema}.review_response
        ALTER COLUMN author_id SET NOT NULL,
        ALTER COLUMN author_role SET NOT NULL,
        ALTER COLUMN message SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'draft',
        ALTER COLUMN responder_user_id DROP NOT NULL,
        ALTER COLUMN public_response DROP NOT NULL;
      `);

      await queryRunner.query(`
        CREATE INDEX ASYNC review_response_review_status_idx_${schema}
        ON ${schema}.review_response (review_id, status, deleted_at);
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_response_review_status_idx_${schema};`);

      await queryRunner.query(`
        UPDATE ${schema}.review_response
        SET
          responder_user_id = COALESCE(responder_user_id, author_id),
          public_response = COALESCE(public_response, message),
          status = CASE
            WHEN status = 'published' THEN 'PUBLISHED'
            ELSE 'SUBMITTED'
          END;
      `);

      await queryRunner.query(`
        ALTER TABLE ${schema}.review_response
        ALTER COLUMN responder_user_id SET NOT NULL,
        ALTER COLUMN public_response SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'SUBMITTED',
        DROP COLUMN IF EXISTS author_id,
        DROP COLUMN IF EXISTS author_role,
        DROP COLUMN IF EXISTS message,
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS deleted_at;
      `);
    }
  }
}
