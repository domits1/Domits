const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class PropertyModerationEvent20261029 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.property_moderation_event (
            id VARCHAR(255) NOT NULL PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            action VARCHAR(20) NOT NULL,
            actor_id VARCHAR(255) NOT NULL,
            reason TEXT NULL,
            from_status VARCHAR(50) NOT NULL,
            to_status VARCHAR(50) NOT NULL,
            created_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS property_moderation_event_property_created_idx${suffix}
        ON ${schema}.property_moderation_event (property_id, created_at);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_moderation_event_property_created_idx${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.property_moderation_event;`);
    }
  }
}
