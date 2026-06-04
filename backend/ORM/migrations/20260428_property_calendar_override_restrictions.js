export class PropertyCalendarOverrideRestrictions20260428 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_calendar_override
      ADD COLUMN IF NOT EXISTS stop_sell BOOLEAN,
      ADD COLUMN IF NOT EXISTS closed_to_arrival BOOLEAN,
      ADD COLUMN IF NOT EXISTS closed_to_departure BOOLEAN,
      ADD COLUMN IF NOT EXISTS min_stay INTEGER,
      ADD COLUMN IF NOT EXISTS max_stay INTEGER;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_calendar_override
      DROP COLUMN IF EXISTS stop_sell,
      DROP COLUMN IF EXISTS closed_to_arrival,
      DROP COLUMN IF EXISTS closed_to_departure,
      DROP COLUMN IF EXISTS min_stay,
      DROP COLUMN IF EXISTS max_stay;
    `);
  }
}
