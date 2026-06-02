export class BookingCancellationPolicy20260415 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(50);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS cancellation_policy;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS cancellation_policy;
    `);
  }
}
