export class EnterpriseRatePlan20260921 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE main.property
            ADD COLUMN IF NOT EXISTS enterpriseid VARCHAR(255);
        `);

        await queryRunner.query(`
            ALTER TABLE main.property
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        `);

        await queryRunner.query(`
            UPDATE main.property
            SET is_deleted = FALSE
            WHERE is_deleted IS NULL;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.enterprise_rate_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                enterprise_id VARCHAR(255) NOT NULL,
                price_per_property_cents INTEGER NOT NULL DEFAULT 4900,
                currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
                billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
                status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                effective_until TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await queryRunner.query(`
            CREATE INDEX ASYNC idx_enterprise_rate_plans_enterprise_id
            ON main.enterprise_rate_plans (enterprise_id);
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            DROP INDEX IF EXISTS main.idx_enterprise_rate_plans_enterprise_id;
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS main.enterprise_rate_plans;
        `);

        await queryRunner.query(`
            ALTER TABLE main.property
            DROP COLUMN IF EXISTS enterpriseid;
        `);

        await queryRunner.query(`
            ALTER TABLE main.property
            DROP COLUMN IF EXISTS is_deleted;
        `);
    }
}