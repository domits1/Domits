export class GuestRiskAssessment20261012 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test.guest_risk_assessment (
        id VARCHAR(255) PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        bookingid VARCHAR(255) NOT NULL,
        providerassessmentid VARCHAR(255),
        status VARCHAR(30) NOT NULL,
        flaggedreason TEXT,
        errormessage TEXT,
        arrivaldate BIGINT,
        departuredate BIGINT,
        createdat BIGINT NOT NULL,
        updatedat BIGINT NOT NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC IF NOT EXISTS guest_risk_assessment_bookingid_idx_test ON test.guest_risk_assessment (bookingid);`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.guest_risk_assessment (
        id VARCHAR(255) PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        bookingid VARCHAR(255) NOT NULL,
        providerassessmentid VARCHAR(255),
        status VARCHAR(30) NOT NULL,
        flaggedreason TEXT,
        errormessage TEXT,
        arrivaldate BIGINT,
        departuredate BIGINT,
        createdat BIGINT NOT NULL,
        updatedat BIGINT NOT NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC IF NOT EXISTS guest_risk_assessment_bookingid_idx ON main.guest_risk_assessment (bookingid);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS main.guest_risk_assessment_bookingid_idx;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.guest_risk_assessment;`);

    await queryRunner.query(`DROP INDEX IF EXISTS test.guest_risk_assessment_bookingid_idx_test;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test.guest_risk_assessment;`);
  }
}