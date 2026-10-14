export class BookingTestSchemaReconcile20260904 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refunded_amount BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refund_error TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS total_price DOUBLE PRECISION;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS total_price;
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
