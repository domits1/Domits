export class RoomPriceGenieIntegration20260504 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.roompricegenie_integration (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        host_id VARCHAR NOT NULL,
        domits_property_id VARCHAR NOT NULL,
        rpg_property_code VARCHAR,
        client_id VARCHAR,
        client_secret_ref VARCHAR,
        token_secret_ref VARCHAR,
        token_expires_at BIGINT,
        is_active BOOLEAN NOT NULL DEFAULT false,
        sync_mode VARCHAR NOT NULL DEFAULT 'manual',
        min_price INT,
        max_price INT,
        created_at BIGINT NOT NULL,
        last_sync_at BIGINT,
        last_sync_status VARCHAR,
        last_sync_error VARCHAR
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC rpg_integration_host_idx ON main.roompricegenie_integration (host_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC rpg_integration_property_idx ON main.roompricegenie_integration (domits_property_id);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.roompricegenie_integration;`);
  }
}
