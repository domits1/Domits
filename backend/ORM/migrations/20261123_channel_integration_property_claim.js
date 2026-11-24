// Record of the hand-applied migration for claiming a listing before provisioning (design note D2, #506).
// Nothing in the repo runs it; the .sql file and docs/internal/tools/dsql_channel_property_claim_runbook.md
// hold the statements, the checks and the order. DSQL allows one DDL statement per transaction and no
// DDL together with DML, so every statement below is its own query.
export class ChannelIntegrationPropertyClaim20261123 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.channel_integration_property ALTER COLUMN "externalPropertyId" DROP NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE main.channel_integration_property SET status = 'ARCHIVED'
      WHERE id = '5f3fc6b0-da85-4ffb-b331-b74c24460099' AND status = 'ACTIVE';
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_property_in_use_unique
      ON main.channel_integration_property ("integrationAccountId", "domitsPropertyId")
      WHERE status IN ('PROVISIONING', 'ACTIVE', 'active');
    `);
  }

  // DSQL cannot SET NOT NULL on an existing table, so the column stays nullable after a rollback.
  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS main.channel_integration_property_in_use_unique;
    `);

    await queryRunner.query(`
      UPDATE main.channel_integration_property SET status = 'ACTIVE'
      WHERE id = '5f3fc6b0-da85-4ffb-b331-b74c24460099' AND status = 'ARCHIVED';
    `);
  }
}
