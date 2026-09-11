export class CommunicationPreferences20260907 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.communication_preferences (
        user_id VARCHAR NOT NULL,
        persona VARCHAR NOT NULL,
        reservation_email BOOLEAN NOT NULL DEFAULT TRUE,
        reservation_sms BOOLEAN NOT NULL DEFAULT FALSE,
        reservation_push BOOLEAN NOT NULL DEFAULT TRUE,
        cancellation_email BOOLEAN NOT NULL DEFAULT TRUE,
        cancellation_sms BOOLEAN NOT NULL DEFAULT TRUE,
        cancellation_push BOOLEAN NOT NULL DEFAULT TRUE,
        messages_email BOOLEAN NOT NULL DEFAULT TRUE,
        messages_sms BOOLEAN NOT NULL DEFAULT FALSE,
        messages_push BOOLEAN NOT NULL DEFAULT TRUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, persona),
        CONSTRAINT communication_preferences_persona_chk
          CHECK (persona IN ('HOST', 'GUEST')),
        CONSTRAINT communication_preferences_required_email_chk
          CHECK (reservation_email = TRUE AND cancellation_email = TRUE)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.communication_preferences;`);
  }
}
