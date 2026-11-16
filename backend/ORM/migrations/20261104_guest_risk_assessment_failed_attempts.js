export class GuestRiskAssessmentFailedAttempts20261104 {
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE test.guest_risk_assessment ADD COLUMN IF NOT EXISTS failedattempts INTEGER;`);
    await queryRunner.query(`ALTER TABLE main.guest_risk_assessment ADD COLUMN IF NOT EXISTS failedattempts INTEGER;`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE main.guest_risk_assessment DROP COLUMN IF EXISTS failedattempts;`);
    await queryRunner.query(`ALTER TABLE test.guest_risk_assessment DROP COLUMN IF EXISTS failedattempts;`);
  }
}
