export class CalendarOverridesWeekendrateIcalSource20260227 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.property_pricing
      ADD COLUMN IF NOT EXISTS weekendrate INTEGER;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_calendar_override (
        property_id VARCHAR(255) NOT NULL,
        calendar_date BIGINT NOT NULL,
        is_available BOOLEAN,
        nightly_price INTEGER,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (property_id, calendar_date)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC property_calendar_override_property_idx ON main.property_calendar_override (property_id);`
    );
    await queryRunner.query(
      `CREATE INDEX ASYNC property_calendar_override_date_idx ON main.property_calendar_override (calendar_date);`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.property_ical_source (
        property_id VARCHAR(255) NOT NULL,
        source_id VARCHAR(255) NOT NULL,
        calendar_name VARCHAR(255) NOT NULL,
        calendar_url TEXT NOT NULL,
        blocked_dates TEXT,
        last_sync_at VARCHAR(255),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        etag VARCHAR(255),
        last_modified VARCHAR(255),
        PRIMARY KEY (property_id, source_id)
      );
    `);
    await queryRunner.query(
      `CREATE INDEX ASYNC property_ical_source_property_idx ON main.property_ical_source (property_id);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_calendar_override;`);
    await queryRunner.query(`DROP TABLE IF EXISTS main.property_ical_source;`);
    await queryRunner.query(`
      ALTER TABLE main.property_pricing
      DROP COLUMN IF EXISTS weekendrate;
    `);
  }
}
