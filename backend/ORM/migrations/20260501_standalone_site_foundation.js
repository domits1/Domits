export class StandaloneSiteFoundation20260501 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.standalone_site (
        id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        site_name VARCHAR(255) NOT NULL,
        primary_locale VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        template_key VARCHAR(255) NOT NULL,
        published_property_snapshot_json TEXT NOT NULL,
        published_content_overrides_json TEXT NOT NULL,
        published_theme_overrides_json TEXT NOT NULL,
        preview_token_hash VARCHAR(255) NULL,
        published_at BIGINT NULL,
        suspended_at BIGINT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX ASYNC standalone_site_property_unique ON main.standalone_site (property_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_host_idx ON main.standalone_site (host_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_status_idx ON main.standalone_site (status);`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.standalone_site_domain (
        id VARCHAR(255) NOT NULL,
        site_id VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        domain_type VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        is_primary BOOLEAN NOT NULL,
        verification_details_json TEXT NOT NULL,
        last_checked_at BIGINT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX ASYNC standalone_site_domain_unique ON main.standalone_site_domain (domain);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_domain_site_idx ON main.standalone_site_domain (site_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC standalone_site_domain_status_idx ON main.standalone_site_domain (status);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.standalone_site_domain;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.standalone_site;`);
  }
}
