export class InvoiceMoneyFields20261124 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.invoice
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
    `);

    await queryRunner.query(`
      ALTER TABLE main.invoice
      ADD COLUMN IF NOT EXISTS rate_per_night_minor BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.invoice
      ADD COLUMN IF NOT EXISTS gross_amount_minor BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.invoice
      ADD COLUMN IF NOT EXISTS commission_amount_minor BIGINT;
    `);

    await queryRunner.query(`
      ALTER TABLE main.invoice
      ADD COLUMN IF NOT EXISTS net_amount_minor BIGINT;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE main.invoice DROP COLUMN IF EXISTS net_amount_minor;`);
    await queryRunner.query(`ALTER TABLE main.invoice DROP COLUMN IF EXISTS commission_amount_minor;`);
    await queryRunner.query(`ALTER TABLE main.invoice DROP COLUMN IF EXISTS gross_amount_minor;`);
    await queryRunner.query(`ALTER TABLE main.invoice DROP COLUMN IF EXISTS rate_per_night_minor;`);
    await queryRunner.query(`ALTER TABLE main.invoice DROP COLUMN IF EXISTS currency;`);
  }
}
