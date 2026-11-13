export class ReviewRequestSchedule20261022 {
  async up(runner) {
    for (const schema of ["test", "main"]) {
      await runner.query(`ALTER TABLE ${schema}.property ADD COLUMN IF NOT EXISTS review_requests_enabled BOOLEAN NOT NULL DEFAULT TRUE`);
      await runner.query(`ALTER TABLE ${schema}.property ADD COLUMN IF NOT EXISTS review_request_delay_hours INTEGER NOT NULL DEFAULT 0`);
    }
  }
  async down(runner) {
    for (const schema of ["test", "main"]) {
      await runner.query(`ALTER TABLE ${schema}.property DROP COLUMN IF EXISTS review_request_delay_hours`);
      await runner.query(`ALTER TABLE ${schema}.property DROP COLUMN IF EXISTS review_requests_enabled`);
    }
  }
}
