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
    // Aurora DSQL cannot add NOT NULL on an existing table's column (SET NOT NULL
    // does not exist for existing tables — see docs/internal/tools/dsql_booking_columns_runbook.md).
    // DEFAULT applies to future writes only, so existing rows stay NULL until backfilled;
    // see the companion .sql file's backfill step and 20260917_property_draft_content.sql.
    await queryRunner.query(`
      ALTER TABLE main.property_draft ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT';
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
