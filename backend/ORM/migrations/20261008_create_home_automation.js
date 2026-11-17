const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class HomeAutomation20261008 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.home_automation_device (
            id VARCHAR(255) NOT NULL PRIMARY KEY,
            integration_account_id VARCHAR(255) NOT NULL,
            provider_device_id VARCHAR(255) NOT NULL,
            property_id VARCHAR(255) NOT NULL,
            unit_id VARCHAR(255) NULL,
            device_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NULL,
            capabilities TEXT NULL,
            status VARCHAR(50) NOT NULL,
            battery_level INTEGER NULL,
            last_seen_at BIGINT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS home_automation_device_provider_unique${suffix}
        ON ${schema}.home_automation_device (integration_account_id, provider_device_id);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS home_automation_device_property_id_idx${suffix}
        ON ${schema}.home_automation_device (property_id);
      `);

      // failure_reason must never contain a PIN, an access code or any other secret.
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.access_credential (
            id VARCHAR(255) NOT NULL PRIMARY KEY,
            integration_account_id VARCHAR(255) NOT NULL,
            booking_id VARCHAR(255) NOT NULL,
            property_id VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            guest_id VARCHAR(255) NULL,
            provider_credential_id VARCHAR(255) NULL,
            credential_type VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            valid_from BIGINT NOT NULL,
            valid_until BIGINT NOT NULL,
            revoked_at BIGINT NULL,
            failure_reason TEXT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_booking_device_unique${suffix}
        ON ${schema}.access_credential (booking_id, device_id);
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS access_credential_provider_credential_unique${suffix}
        ON ${schema}.access_credential (integration_account_id, provider_credential_id);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.access_credential_provider_credential_unique${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.access_credential_booking_device_unique${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.access_credential;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.home_automation_device_property_id_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.home_automation_device_provider_unique${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.home_automation_device;`);
    }
  }
}
