export class BookingCurrency20261113 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS currency;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS currency;
    `);
  }
}
