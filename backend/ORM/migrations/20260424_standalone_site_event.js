export class StandaloneSiteEvent20260424 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.standalone_site_event (
        id VARCHAR PRIMARY KEY,
        draft_id VARCHAR NULL,
        property_id VARCHAR NULL,
        host_id VARCHAR NOT NULL,
        event_type VARCHAR NOT NULL,
        payload_json TEXT NULL,
        occurred_at BIGINT NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS standalone_site_event_host_event_time_idx
      ON main.standalone_site_event (host_id, event_type, occurred_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS standalone_site_event_draft_time_idx
      ON main.standalone_site_event (draft_id, occurred_at DESC);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS main.standalone_site_event;
    `);
  }
}
