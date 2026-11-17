export class DestinationTestSchema20261019 {
  async up(queryRunner) {
    await queryRunner.query("CREATE SCHEMA IF NOT EXISTS test;");

    const createSchemaObjects = async (schema, suffix) => {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.destination (
          id VARCHAR(1024) PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          parent_id VARCHAR(1024) NULL,
          slug VARCHAR(255) NOT NULL,
          path VARCHAR(1024) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          country_code VARCHAR(2) NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.property_destination (
          property_id VARCHAR(255) PRIMARY KEY,
          destination_id VARCHAR(1024) NOT NULL,
          source_country VARCHAR(255) NOT NULL,
          source_city VARCHAR(255) NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ASYNC IF NOT EXISTS destination_path_unique${suffix} ON ${schema}.destination (path);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS destination_parent${suffix} ON ${schema}.destination (parent_id);
      `);
      await queryRunner.query(`
        CREATE INDEX ASYNC IF NOT EXISTS property_destination_destination${suffix} ON ${schema}.property_destination (destination_id);
      `);
    };

    await createSchemaObjects("test", "_test");
  }

  async down(queryRunner) {
    const schema = "test";
    const suffix = "_test";
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.property_destination_destination${suffix};`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.destination_parent${suffix};`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.destination_path_unique${suffix};`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.property_destination;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.destination;`);
  }
}
