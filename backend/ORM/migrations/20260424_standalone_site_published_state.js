export class StandaloneSitePublishedState20260424 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site_draft
      ADD COLUMN IF NOT EXISTS published_content_overrides_json TEXT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site_draft
      ADD COLUMN IF NOT EXISTS published_theme_overrides_json TEXT NULL;
    `);

    await queryRunner.query(`
      UPDATE main.standalone_site_draft
      SET published_content_overrides_json = content_overrides_json
      WHERE published_content_overrides_json IS NULL;
    `);

    await queryRunner.query(`
      UPDATE main.standalone_site_draft
      SET published_theme_overrides_json = theme_overrides_json
      WHERE published_theme_overrides_json IS NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site_draft
      DROP COLUMN IF EXISTS published_content_overrides_json;
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS main.standalone_site_draft
      DROP COLUMN IF EXISTS published_theme_overrides_json;
    `);
  }
}
