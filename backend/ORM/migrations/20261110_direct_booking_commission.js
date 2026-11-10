export class DirectBookingCommission20261110 {
  async up(queryRunner) {
    const columns = [
      "paid_at BIGINT",
      "commissionable_amount_cents BIGINT",
      "domits_commission_rate_bps INTEGER",
      "domits_commission_amount_cents BIGINT",
      "domits_commission_annual_revenue_cents BIGINT",
      "domits_commission_period_start BIGINT",
    ];

    for (const column of columns) {
      await queryRunner.query(`ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS ${column};`);
    }

    for (const column of columns) {
      await queryRunner.query(`ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS ${column};`);
    }
  }

  async down(queryRunner) {
    const columns = [
      "domits_commission_period_start",
      "domits_commission_annual_revenue_cents",
      "domits_commission_amount_cents",
      "domits_commission_rate_bps",
      "commissionable_amount_cents",
      "paid_at",
    ];

    for (const column of columns) {
      await queryRunner.query(`ALTER TABLE main.booking DROP COLUMN IF EXISTS ${column};`);
    }

    for (const column of columns) {
      await queryRunner.query(`ALTER TABLE test.booking DROP COLUMN IF EXISTS ${column};`);
    }
  }
}
