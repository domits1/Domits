export class PropertyTaskSource20261008 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property_task
                ADD COLUMN IF NOT EXISTS source VARCHAR;
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE main.property_task DROP COLUMN IF EXISTS source;`);
    }
}
