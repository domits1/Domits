export class PropertyTasks20260324 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.property_task (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                host_id VARCHAR NOT NULL,
                property_id VARCHAR NOT NULL,
                property_snapshot_label VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                description TEXT,
                type VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'Pending',
                priority VARCHAR NOT NULL DEFAULT 'Medium',
                due_date BIGINT,
                assignee_name VARCHAR,
                completed_date BIGINT,
                is_legacy BOOLEAN NOT NULL DEFAULT false,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC property_task_host_idx ON main.property_task (host_id);`
        );
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.property_task_activity (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                task_id UUID NOT NULL,
                user_id VARCHAR NOT NULL,
                action_type VARCHAR,
                description TEXT,
                old_value TEXT,
                new_value TEXT,
                created_at BIGINT NOT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC property_task_activity_task_idx ON main.property_task_activity (task_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS main.property_task_activity;`);
        await queryRunner.query(`DROP TABLE IF EXISTS main.property_task;`);
    }
}
