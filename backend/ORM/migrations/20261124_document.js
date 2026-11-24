const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class Document20261124 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.document (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            host_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            category VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
            review_status VARCHAR(20) NULL,
            current_version_id UUID NULL,
            issue_date BIGINT NULL,
            expiration_date BIGINT NULL,
            created_by VARCHAR(255) NOT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL,
            archived_at BIGINT NULL,
            deleted_at BIGINT NULL
        );
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_host_id_idx${suffix}
        ON ${schema}.document (host_id);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_host_id_category_idx${suffix}
        ON ${schema}.document (host_id, category);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_host_id_expiration_date_idx${suffix}
        ON ${schema}.document (host_id, expiration_date);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.document_version (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            document_id UUID NOT NULL,
            host_id VARCHAR(255) NOT NULL,
            version_number INTEGER NOT NULL,
            storage_key VARCHAR(1024) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_size BIGINT NOT NULL,
            checksum VARCHAR(128) NULL,
            uploaded_by VARCHAR(255) NOT NULL,
            change_description TEXT NULL,
            created_at BIGINT NOT NULL,
            CONSTRAINT document_version_version_number_check${suffix} CHECK (version_number >= 1),
            CONSTRAINT document_version_file_size_check${suffix} CHECK (file_size > 0)
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_version_document_id_version_number_unique${suffix}
        ON ${schema}.document_version (document_id, version_number);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS document_version_host_id_idx${suffix}
        ON ${schema}.document_version (host_id);
      `);

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
        CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_idx${suffix}
        ON ${schema}.document_activity (host_id);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_activity_host_id_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_activity_document_id_created_at_idx${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document_activity;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_relationship_host_id_entity_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_relationship_document_entity_unique${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document_relationship;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_version_host_id_idx${suffix};`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS ${schema}.document_version_document_id_version_number_unique${suffix};`
      );
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document_version;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_host_id_expiration_date_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_host_id_category_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.document_host_id_idx${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.document;`);
    }
  }
}
