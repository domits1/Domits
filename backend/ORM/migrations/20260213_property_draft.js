export class PropertyDraft20260213 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_draft (
        property_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL,
        last_activity_at BIGINT NOT NULL,
        PRIMARY KEY (property_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC property_draft_host_idx ON main.property_draft (host_id);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_draft;`);
  }
}
