export class PropertyLocationLatLon20260603 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_location
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
    `);

    await queryRunner.query(`
      ALTER TABLE main.property_location
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_location
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_location
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_location
      DROP COLUMN IF EXISTS latitude;
    `);

    await queryRunner.query(`
      ALTER TABLE main.property_location
      DROP COLUMN IF EXISTS longitude;
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_location
      DROP COLUMN IF EXISTS latitude;
    `);

    await queryRunner.query(`
      ALTER TABLE test.property_location
      DROP COLUMN IF EXISTS longitude;
    `);
  }
}
