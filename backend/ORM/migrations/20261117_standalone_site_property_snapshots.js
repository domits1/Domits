export class StandaloneSitePropertySnapshots20261117 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site
      ADD COLUMN IF NOT EXISTS published_site_properties_json TEXT NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site
      DROP COLUMN IF EXISTS published_site_properties_json;
    `);
  }
}
