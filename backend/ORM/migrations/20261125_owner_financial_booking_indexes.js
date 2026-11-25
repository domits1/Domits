export class OwnerFinancialBookingIndexes20261125 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx_test
      ON test.booking (hostid, property_id, createdat, id);
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx_test
      ON test.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx
      ON main.booking (hostid, property_id, createdat, id);
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx
      ON main.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS main.booking_owner_financial_stay_idx;`);
    await queryRunner.query(`DROP INDEX IF EXISTS main.booking_owner_financial_created_idx;`);
    await queryRunner.query(`DROP INDEX IF EXISTS test.booking_owner_financial_stay_idx_test;`);
    await queryRunner.query(`DROP INDEX IF EXISTS test.booking_owner_financial_created_idx_test;`);
  }
}
