const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class HomeAutomationDeviceAudit20261023 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      // Append-only, and it holds ids only: no device name, token or secret ever goes in a row.
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.home_automation_device_audit (
            id VARCHAR(255) NOT NULL PRIMARY KEY,
            integration_account_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            provider_device_id VARCHAR(255) NOT NULL,
            action VARCHAR(20) NOT NULL,
            old_property_id VARCHAR(255) NULL,
            new_property_id VARCHAR(255) NULL,
            created_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_audit_account_created_idx${suffix}
        ON ${schema}.home_automation_device_audit (integration_account_id, created_at);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS ${schema}.home_automation_device_audit_account_created_idx${suffix};`
      );
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.home_automation_device_audit;`);
    }
  }
}
