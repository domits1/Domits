export class BookingMoneyFields20261124 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS total_price_minor BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS refund_requested_amount BIGINT;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE main.booking DROP COLUMN IF EXISTS refund_requested_amount;`);
    await queryRunner.query(`ALTER TABLE main.booking DROP COLUMN IF EXISTS total_price_minor;`);
    await queryRunner.query(`ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_requested_amount;`);
    await queryRunner.query(`ALTER TABLE test.booking DROP COLUMN IF EXISTS total_price_minor;`);
  }
}
