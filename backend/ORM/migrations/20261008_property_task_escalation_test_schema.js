export class PropertyTaskEscalationTestSchema20261008 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE test.property_task
                ADD COLUMN IF NOT EXISTS escalated_at BIGINT;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE test.property_task DROP COLUMN IF EXISTS escalated_at;`);
    }
}
