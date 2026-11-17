export class StaticPageOutbox20260930 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site
      ADD COLUMN IF NOT EXISTS static_page_revision BIGINT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.static_page_outbox (
        site_id VARCHAR(255) PRIMARY KEY,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        revision BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        failure_reason TEXT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        processed_at BIGINT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS static_page_outbox_status_updated
      ON main.static_page_outbox (status, updated_at);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS main.static_page_outbox_status_updated;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS main.static_page_outbox;
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site
      DROP COLUMN IF EXISTS static_page_revision;
    `);
  }
}
