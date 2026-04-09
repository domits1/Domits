export class GuestFavoritePlaceholderAlignment20260312 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.guest_favorite
      DROP CONSTRAINT IF EXISTS guest_favorite_property_placeholder_chk;
    `);

    await queryRunner.query(`
      ALTER TABLE main.guest_favorite
      ALTER COLUMN propertyId DROP NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE main.guest_favorite
      SET isPlaceholder = CASE WHEN propertyId IS NULL THEN TRUE ELSE FALSE END;
    `);

    await queryRunner.query(`
      ALTER TABLE main.guest_favorite
      ADD CONSTRAINT guest_favorite_property_placeholder_chk
      CHECK (
        (isPlaceholder = TRUE AND propertyId IS NULL) OR
        (isPlaceholder = FALSE AND propertyId IS NOT NULL)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE main.guest_favorite
      DROP CONSTRAINT IF EXISTS guest_favorite_property_placeholder_chk;
    `);

    await queryRunner.query(`
      UPDATE main.guest_favorite
      SET propertyId = '__placeholder__'
      WHERE propertyId IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE main.guest_favorite
      ALTER COLUMN propertyId SET NOT NULL;
    `);
  }
}
