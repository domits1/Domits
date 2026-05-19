export class TeamMembers20260513 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.team_member (
                id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                host_id         VARCHAR NOT NULL,
                member_email    VARCHAR NOT NULL,
                member_user_id  VARCHAR,
                role            VARCHAR NOT NULL DEFAULT 'Property Operations Manager',
                status          VARCHAR NOT NULL DEFAULT 'pending',
                invite_token    UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
                invited_at      BIGINT NOT NULL,
                accepted_at     BIGINT
            );
        `);
        await queryRunner.query(
            `CREATE INDEX ASYNC team_member_host_idx ON main.team_member (host_id);`
        );
        await queryRunner.query(
            `CREATE INDEX ASYNC team_member_token_idx ON main.team_member (invite_token);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS main.team_member;`);
    }
}
