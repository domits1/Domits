export class PropertyTaskOverdueNotified20261019 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS overdue_last_notified_at BIGINT;
        `);
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS overdue_notify_count BIGINT;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE main.property_task DROP COLUMN IF EXISTS overdue_last_notified_at;`);
        await queryRunner.query(`ALTER TABLE main.property_task DROP COLUMN IF EXISTS overdue_notify_count;`);
    }
}
