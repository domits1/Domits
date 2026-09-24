// Review: Adds automated review reminder scheduling and email preference storage.
export class ReviewWorkflow20260922 {
  async up(queryRunner) {
    // Review: Adds reminder counters, worker-claim fields, and notification preferences.
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`ALTER TABLE ${schema}.review_request ADD COLUMN IF NOT EXISTS send_count INT NOT NULL DEFAULT 0`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request ADD COLUMN IF NOT EXISTS last_sent_at BIGINT`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request ADD COLUMN IF NOT EXISTS next_send_at BIGINT`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request ADD COLUMN IF NOT EXISTS claimed_at BIGINT`);
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${schema}.review_notification_preference (
        user_id VARCHAR(255) PRIMARY KEY,
        email_enabled BOOLEAN NOT NULL DEFAULT true,
        updated_at BIGINT NOT NULL
      )`);
      await queryRunner.query(`CREATE INDEX ASYNC review_request_due_${schema} ON ${schema}.review_request (next_send_at, status)`);
    }
  }

  async down(queryRunner) {
    // Review: Removes reminder scheduling fields and notification preferences.
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.review_request_due_${schema}`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_notification_preference`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request DROP COLUMN IF EXISTS claimed_at`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request DROP COLUMN IF EXISTS next_send_at`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request DROP COLUMN IF EXISTS last_sent_at`);
      await queryRunner.query(`ALTER TABLE ${schema}.review_request DROP COLUMN IF EXISTS send_count`);
    }
  }
}
