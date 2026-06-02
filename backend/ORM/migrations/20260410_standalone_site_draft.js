export class StandaloneSiteDraft20260410 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.standalone_site_draft (
        id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        template_key VARCHAR(128) NOT NULL,
        status VARCHAR(64) NOT NULL,
        content_overrides_json TEXT NOT NULL,
        theme_overrides_json TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        last_preview_built_at BIGINT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX ASYNC standalone_site_draft_property_unique ON main.standalone_site_draft (property_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_draft_host_idx ON main.standalone_site_draft (host_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_draft_status_idx ON main.standalone_site_draft (status);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_draft_updated_idx ON main.standalone_site_draft (updated_at);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.standalone_site_draft;`);
  }
}
