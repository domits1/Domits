export class CompanyProfile20260915 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.company_profile (
        host_id VARCHAR NOT NULL,
        company_name VARCHAR NOT NULL,
        display_name VARCHAR,
        logo_url VARCHAR,
        description VARCHAR,
        website VARCHAR,
        public_email VARCHAR,
        public_phone VARCHAR,
        country VARCHAR,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (host_id)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.company_profile;`);
  }
}
