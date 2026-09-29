export class PropertyTaskAssigneeAndDependency20260929 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS assignee_team_member_id UUID DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS parent_task_id UUID DEFAULT NULL;
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC property_task_assignee_idx ON main.property_task (assignee_team_member_id);`
        );
        await queryRunner.query(
            `CREATE INDEX ASYNC property_task_parent_idx ON main.property_task (parent_task_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property_task
                DROP COLUMN IF EXISTS assignee_team_member_id,
                DROP COLUMN IF EXISTS parent_task_id;
        `);
    }
}
