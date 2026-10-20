const SCHEMAS = ["test", "main"];

export class HomeAutomationCredentialLease20261014 {
  async up(queryRunner) {
    for (const schema of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.home_automation_credential_lease (
            integration_account_id VARCHAR(255) NOT NULL PRIMARY KEY,
            owner_id VARCHAR(255) NOT NULL,
            lease_expires_at BIGINT NOT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        );
      `);
    }
  }

  async down(queryRunner) {
    for (const schema of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.home_automation_credential_lease;`);
    }
  }
}
