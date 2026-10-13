export class PropertyCustomRules20261006 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS test.property_custom_rules (
                id VARCHAR(255) NOT NULL PRIMARY KEY,
                property_id VARCHAR(255) NOT NULL,
                category VARCHAR NOT NULL,
                rule_text TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                created_at BIGINT NOT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC IF NOT EXISTS property_custom_rules_property_id_idx_test ON test.property_custom_rules (property_id);`
        );

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.property_custom_rules (
                id VARCHAR(255) NOT NULL PRIMARY KEY,
                property_id VARCHAR(255) NOT NULL,
                category VARCHAR NOT NULL,
                rule_text TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                created_at BIGINT NOT NULL
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC IF NOT EXISTS property_custom_rules_property_id_idx ON main.property_custom_rules (property_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS main.property_custom_rules_property_id_idx;`);
        await queryRunner.query(`DROP TABLE IF EXISTS main.property_custom_rules;`);

        await queryRunner.query(`DROP INDEX IF EXISTS test.property_custom_rules_property_id_idx_test;`);
        await queryRunner.query(`DROP TABLE IF EXISTS test.property_custom_rules;`);
    }
}
