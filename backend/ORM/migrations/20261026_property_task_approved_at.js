export class PropertyTaskApprovedAt20261026 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE test.property_task
                ADD COLUMN IF NOT EXISTS approved_at BIGINT;
        `);
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS approved_at BIGINT;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE main.property_task DROP COLUMN IF EXISTS approved_at;`);
        await queryRunner.query(`ALTER TABLE test.property_task DROP COLUMN IF EXISTS approved_at;`);
    }
}
