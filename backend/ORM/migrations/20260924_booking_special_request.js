export class BookingSpecialRequest20260924 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS special_request TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS special_request TEXT;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS special_request;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS special_request;
    `);
  }
}
