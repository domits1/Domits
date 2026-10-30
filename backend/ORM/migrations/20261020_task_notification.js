export class TaskNotification20261020 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.task_notification (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                host_id VARCHAR(255) NOT NULL,
                task_id VARCHAR(255) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at BIGINT NOT NULL,
                read_at BIGINT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC IF NOT EXISTS task_notification_user ON main.task_notification (user_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS main.task_notification_user;`);
        await queryRunner.query(`DROP TABLE IF EXISTS main.task_notification;`);
    }
}
