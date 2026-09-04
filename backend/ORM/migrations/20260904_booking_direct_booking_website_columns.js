export class BookingDirectBookingWebsiteColumns20260904 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique_test
      ON test.booking (public_booking_ref);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique_test
      ON test.booking (idempotency_key);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS booking_source VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS site_id VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS public_booking_ref VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC booking_public_booking_ref_unique
      ON main.booking (public_booking_ref);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ASYNC booking_idempotency_key_unique
      ON main.booking (idempotency_key);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS main.booking_idempotency_key_unique;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS main.booking_public_booking_ref_unique;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS idempotency_key;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS public_booking_ref;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS guest_email;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS site_id;
    `);

    await queryRunner.query(`
      ALTER TABLE main.booking
      DROP COLUMN IF EXISTS booking_source;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS test.booking_idempotency_key_unique_test;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS test.booking_public_booking_ref_unique_test;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS idempotency_key;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS public_booking_ref;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS guest_email;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS site_id;
    `);

    await queryRunner.query(`
      ALTER TABLE test.booking
      DROP COLUMN IF EXISTS booking_source;
    `);
  }
}
