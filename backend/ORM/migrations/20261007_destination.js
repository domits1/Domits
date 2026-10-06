export class Destination20261007 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.destination (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        parent_id VARCHAR(255) NULL,
        slug VARCHAR(255) NOT NULL,
        path VARCHAR(1024) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(2) NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_destination (
        property_id VARCHAR(255) PRIMARY KEY,
        destination_id VARCHAR(255) NOT NULL,
        source_country VARCHAR(255) NOT NULL,
        source_city VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC IF NOT EXISTS destination_path_unique ON main.destination (path);
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS destination_parent ON main.destination (parent_id);
    `);

    await queryRunner.query(`
      CREATE INDEX ASYNC IF NOT EXISTS property_destination_destination ON main.property_destination (destination_id);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS main.property_destination_destination;`);
    await queryRunner.query(`DROP INDEX IF EXISTS main.destination_parent;`);
    await queryRunner.query(`DROP INDEX IF EXISTS main.destination_path_unique;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_destination;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.destination;`);
  }
}
