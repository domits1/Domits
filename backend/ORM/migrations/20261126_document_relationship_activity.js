const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class DocumentRelationshipActivity20261126 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.document_relationship (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            document_id UUID NOT NULL,
            host_id VARCHAR(255) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id VARCHAR(255) NOT NULL,
            created_by VARCHAR(255) NOT NULL,
            created_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_relationship_document_entity_unique${suffix}
        ON ${schema}.document_relationship (document_id, entity_type, entity_id);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_relationship_host_id_entity_idx${suffix}
        ON ${schema}.document_relationship (host_id, entity_type, entity_id);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.document_activity (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            document_id UUID NOT NULL,
            host_id VARCHAR(255) NOT NULL,
            actor_id VARCHAR(255) NOT NULL,
            action VARCHAR(50) NOT NULL,
            details TEXT NULL,
            created_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_activity_document_id_created_at_idx${suffix}
        ON ${schema}.document_activity (document_id, created_at);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_created_at_idx${suffix}
        ON ${schema}.document_activity (host_id, created_at);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_activity_host_id_created_at_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_activity_document_id_created_at_idx${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document_activity;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_relationship_host_id_entity_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_relationship_document_entity_unique${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document_relationship;`);
    }
  }
}
