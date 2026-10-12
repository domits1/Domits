export class BookingCheckedOutAt20261008 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.booking
                ADD COLUMN IF NOT EXISTS checked_out_at BIGINT;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE main.booking DROP COLUMN IF EXISTS checked_out_at;`);
    }
}
