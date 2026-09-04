// Reconciles test.booking with the Booking entity.
//
// Found during the 2026-09-04 catalog read for the direct booking website columns:
// 20260520_booking_refund_fields.js records refunded_amount, stripe_refund_id and
// refund_error as applied to both main.booking and test.booking, but test.booking
// never received them. total_price has been on main.booking and in the entity
// since 2026-05-28 (commit 96a91eb2f) with no migration record for either schema,
// and is missing from test.booking as well. main.booking has 19 columns,
// test.booking has 15. Any TypeORM read of the Booking entity with TEST=true fails
// with "column does not exist" until this is applied.
//
// The same catalog read showed no column_default on any of the four columns on
// main.booking: the DEFAULT 0 recorded by the May migration was never applied
// there either. Neither schema has defaults on these columns.
//
// Applied to test.booking and verified on 2026-09-04.
// Every statement is its own Aurora DSQL transaction (one DDL per transaction).
// Columns are added nullable with no DEFAULT; see the companion .sql runbook for
// the verification, rollback and smoke test.
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
