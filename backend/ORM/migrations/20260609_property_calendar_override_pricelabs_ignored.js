export class PropertyCalendarOverridePriceLabsIgnored20260609 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_calendar_override
      ADD COLUMN IF NOT EXISTS pricelabs_ignored BOOLEAN;
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_calendar_override
      ADD COLUMN IF NOT EXISTS pricelabs_ignored BOOLEAN;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_calendar_override
      DROP COLUMN IF EXISTS pricelabs_ignored;
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_calendar_override
      DROP COLUMN IF EXISTS pricelabs_ignored;
    `);
  }
}
