export class DirectBookingCommission20261110 {
  async up(queryRunner) {
    const columns = [
      ["commissionable_accommodation_cents", "BIGINT"],
      ["commission_rate", "NUMERIC(5, 4)"],
      ["commission_amount_cents", "BIGINT"],
      ["commission_annual_revenue_cents", "BIGINT"],
      ["commission_year", "INTEGER"],
    ];

    for (const [name, type] of columns) {
      await queryRunner.query(`
        ALTER TABLE test.booking
        ADD COLUMN IF NOT EXISTS ${name} ${type};
      `);
    }

    for (const [name, type] of columns) {
      await queryRunner.query(`
        ALTER TABLE main.booking
        ADD COLUMN IF NOT EXISTS ${name} ${type};
      `);
    }
  }

  async down(queryRunner) {
    const columns = [
      "commission_year",
      "commission_annual_revenue_cents",
      "commission_amount_cents",
      "commission_rate",
      "commissionable_accommodation_cents",
    ];

    for (const name of columns) {
      await queryRunner.query(`
        ALTER TABLE main.booking
        DROP COLUMN IF EXISTS ${name};
      `);
    }

    for (const name of columns) {
      await queryRunner.query(`
        ALTER TABLE test.booking
        DROP COLUMN IF EXISTS ${name};
      `);
    }
  }
}
