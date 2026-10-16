export class PropertyTaskChecklistItem20261005 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.property_task_checklist_item (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                task_id UUID NOT NULL,
                title VARCHAR NOT NULL,
                position INT NOT NULL DEFAULT 0,
                is_required BOOLEAN NOT NULL DEFAULT true,
                is_checked BOOLEAN NOT NULL DEFAULT false,
                requires_evidence BOOLEAN NOT NULL DEFAULT false,
                evidence_key VARCHAR,
                owner_team_member_id UUID,
                checked_at BIGINT,
                checked_by VARCHAR,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC property_task_checklist_item_task_idx ON main.property_task_checklist_item (task_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS main.property_task_checklist_item;`);
    }
}
