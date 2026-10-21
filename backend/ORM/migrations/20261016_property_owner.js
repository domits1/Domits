const SCHEMAS = [
  { schema: "test", suffix: "_test" },
  { schema: "main", suffix: "" },
];

export class PropertyOwner20261016 {
  async up(queryRunner) {
    for (const { schema, suffix } of SCHEMAS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.property_owner (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            host_id VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            company_name VARCHAR(200) NULL,
            email VARCHAR(254) NOT NULL,
            phone VARCHAR(50) NULL,
            preferred_language VARCHAR(10) NULL,
            owner_type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            notes TEXT NULL,
            owner_user_id VARCHAR(255) NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS property_owner_host_id_idx${suffix}
        ON ${schema}.property_owner (host_id);
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.property_owner_property (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            owner_id UUID NOT NULL,
            property_id VARCHAR(255) NOT NULL,
            host_id VARCHAR(255) NOT NULL,
            ownership_basis_points INTEGER NOT NULL,
            effective_from BIGINT NOT NULL,
            effective_to BIGINT NULL,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL,
            CONSTRAINT property_owner_property_basis_points_check${suffix} CHECK (ownership_basis_points BETWEEN 1 AND 10000),
            CONSTRAINT property_owner_property_period_check${suffix} CHECK (effective_to IS NULL OR effective_to > effective_from)
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_owner_property_from_unique${suffix}
        ON ${schema}.property_owner_property (owner_id, property_id, effective_from);
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS property_owner_property_open_unique${suffix}
        ON ${schema}.property_owner_property (owner_id, property_id)
        WHERE effective_to IS NULL;
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_property_id_idx${suffix}
        ON ${schema}.property_owner_property (property_id);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS property_owner_property_host_id_idx${suffix}
        ON ${schema}.property_owner_property (host_id);
      `);
    }
  }

  async down(queryRunner) {
    for (const { schema, suffix } of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_owner_property_host_id_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_owner_property_property_id_idx${suffix};`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_owner_property_open_unique${suffix};`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS ${schema}.property_owner_property_owner_property_from_unique${suffix};`
      );
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.property_owner_property;`);
      await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_owner_host_id_idx${suffix};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.property_owner;`);
    }
  }
}
