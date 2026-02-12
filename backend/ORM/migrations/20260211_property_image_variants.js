export class PropertyImageVariants20260211 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_image (
        property_id VARCHAR(255) NOT NULL,
        "key" VARCHAR(255) NOT NULL,
        PRIMARY KEY (property_id, "key")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS property_image_legacy_property_idx ON main.property_image (property_id);`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_image_v2 (
        id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS property_image_v2_property_idx ON main.property_image_v2 (property_id);`
    );
    await queryRunner.query(
      `ALTER TABLE main.property_image_v2
       ADD CONSTRAINT property_image_v2_status_check
       CHECK (status IN ('UPLOADING', 'READY', 'FAILED'));`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_image_variant (
        id VARCHAR(255) NOT NULL,
        image_id VARCHAR(255) NOT NULL,
        variant VARCHAR(32) NOT NULL,
        s3_key VARCHAR(255) NOT NULL,
        content_type VARCHAR(128) NOT NULL,
        bytes INT,
        width INT,
        height INT,
        PRIMARY KEY (id),
        UNIQUE (image_id, variant)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS property_image_variant_image_idx ON main.property_image_variant (image_id);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_image_variant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_image_v2;`);
  }
}