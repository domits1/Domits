export class StandaloneSiteDomainCustomSiteUnique20260918 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS standalone_site_domain_custom_site_unique
      ON main.standalone_site_domain (site_id)
      WHERE domain_type = 'CUSTOM';
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS main.standalone_site_domain_custom_site_unique;
    `);
  }
}
