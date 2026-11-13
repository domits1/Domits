export class HostNotificationPreferences20261109 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test.host_notification_preferences (
        user_id VARCHAR NOT NULL,
        preferences TEXT NOT NULL DEFAULT '{}',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.host_notification_preferences (
        user_id VARCHAR NOT NULL,
        preferences TEXT NOT NULL DEFAULT '{}',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.host_notification_preferences;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test.host_notification_preferences;`);
  }
}
