export class ChannexAriOutbox20260924 {
  // Aurora DSQL runs one DDL statement per transaction and never mixes DDL with DML,
  // so each statement stands on its own. See
  // docs/internal/tools/dsql_channex_ari_outbox_runbook.md for the apply order.
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.channex_ari_outbox (
        id VARCHAR(255) PRIMARY KEY,
        domitspropertyid VARCHAR(255) NOT NULL,
        kind VARCHAR(20) NOT NULL,
        changetypes VARCHAR(100) NOT NULL,
        datefrom INTEGER NOT NULL,
        dateto INTEGER NOT NULL,
        source VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        attemptcount INTEGER NOT NULL DEFAULT 0,
        nextattemptat BIGINT,
        failurereason TEXT,
        sentsummary TEXT,
        createdat BIGINT NOT NULL,
        updatedat BIGINT NOT NULL,
        processedat BIGINT
      );
    `);

    // Finds the properties that are ready to send, and claims their rows.
    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS idx_channex_ari_outbox_ready
      ON main.channex_ari_outbox (status, domitspropertyid, createdat);
    `);

    // Finds PROCESSING rows left behind by a crashed run, and old rows for cleanup.
    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS idx_channex_ari_outbox_stale
      ON main.channex_ari_outbox (status, updatedat);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS main.idx_channex_ari_outbox_stale;`);
    await queryRunner.query(`DROP INDEX IF EXISTS main.idx_channex_ari_outbox_ready;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.channex_ari_outbox;`);
  }
}
