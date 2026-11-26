// Record of the hand-applied migration for one Channex account row per host (design note D8, #506).
// Nothing in the repo runs it; the .sql file and docs/internal/tools/dsql_channel_account_unique_runbook.md
// hold the statements, the checks and the order. Only CHANNEX rows: one user has three older BOOKING_COM
// rows (checked 23 Nov) that this key leaves alone.
export class ChannelIntegrationAccountChannexUnique20261123 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS channel_integration_account_channex_user_unique
      ON main.channel_integration_account ("userId", channel)
      WHERE channel = 'CHANNEX';
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS main.channel_integration_account_channex_user_unique;
    `);
  }
}
