export class AddCleaningFeeToProperty20260512 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property
        ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC DEFAULT NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property
        DROP COLUMN IF EXISTS cleaning_fee;
    `);
  }
}
