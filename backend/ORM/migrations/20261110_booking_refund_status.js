export class BookingRefundStatus20261110 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
    `);

    await queryRunner.query(`
      UPDATE test.booking
      SET refund_status = 'unknown'
      WHERE LOWER(status) IN ('cancelled', 'canceled')
        AND refund_status IS NULL
        AND (
          (COALESCE(TRIM(paymentid), '') <> '' AND COALESCE(paymentid, '') NOT LIKE 'FAILED%')
          OR stripe_refund_id IS NOT NULL
          OR COALESCE(refunded_amount, 0) > 0
          OR refund_error IS NOT NULL
        );
    `);

    await queryRunner.query(`
      UPDATE main.booking
      SET refund_status = 'unknown'
      WHERE LOWER(status) IN ('cancelled', 'canceled')
        AND refund_status IS NULL
        AND (
          (COALESCE(TRIM(paymentid), '') <> '' AND COALESCE(paymentid, '') NOT LIKE 'FAILED%')
          OR stripe_refund_id IS NOT NULL
          OR COALESCE(refunded_amount, 0) > 0
          OR refund_error IS NOT NULL
        );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE main.booking DROP COLUMN IF EXISTS refund_status;`);
    await queryRunner.query(`ALTER TABLE test.booking DROP COLUMN IF EXISTS refund_status;`);
  }
}
