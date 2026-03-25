export class GuestFavorite20260312 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.guest_favorite (
        guestid     VARCHAR NOT NULL,
        wishlistkey VARCHAR NOT NULL,
        isplaceholder BOOLEAN NOT NULL,
        propertyid  VARCHAR,
        wishlistname VARCHAR NOT NULL,
        PRIMARY KEY (guestid, wishlistkey)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX ASYNC guest_favorite_guestid_idx ON main.guest_favorite (guestid);`
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS main.guest_favorite;`);
  }
}
