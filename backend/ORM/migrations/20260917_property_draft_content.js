export class PropertyDraftContent20260917 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS address_line VARCHAR(500);
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS capacity INT;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS bedrooms INT;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS bathrooms INT;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS status;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS bathrooms;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS bedrooms;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS capacity;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS property_type;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS address_line;
    `);
    await queryRunner.query(`
      ALTER TABLE main.property_draft DROP COLUMN IF EXISTS name;
    `);
  }
}
