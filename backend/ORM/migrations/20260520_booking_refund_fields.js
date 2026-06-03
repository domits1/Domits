export class BookingRefundFields20260520 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS refunded_amount BIGINT DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS refund_error TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refunded_amount BIGINT DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refund_error TEXT;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS refund_error;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS stripe_refund_id;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS refunded_amount;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS refund_error;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS stripe_refund_id;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS refunded_amount;
    `);
  }
}
