export class BookingCancelledAt20261030 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS cancelled_at;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS cancelled_at;
    `);
  }
}
