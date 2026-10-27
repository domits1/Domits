export class TaskDueSoon20261023 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS due_soon_notified_for BIGINT;
        `);
        await queryRunner.query(`
            ALTER TABLE main.host_settings
                ADD COLUMN IF NOT EXISTS notif_email_due_soon BOOLEAN;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE main.property_task DROP COLUMN IF EXISTS due_soon_notified_for;`);
        await queryRunner.query(`ALTER TABLE main.host_settings DROP COLUMN IF EXISTS notif_email_due_soon;`);
    }
}
