
export class CreateReviews20260930 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS main.review (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                reservation_id VARCHAR NOT NULL,
                property_id VARCHAR NOT NULL,
                host_id VARCHAR NOT NULL,
                guest_id VARCHAR NOT NULL,
                overall_rating DOUBLE PRECISION NOT NULL,
                public_review TEXT,
                private_feedback TEXT,
                verification_status VARCHAR NOT NULL DEFAULT 'pending',
                publication_status VARCHAR NOT NULL DEFAULT 'draft',
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );
        `);

        await queryRunner.query(
            `CREATE UNIQUE INDEX ASYNC review_reservation_unique_idx ON main.review (reservation_id);`
        );
        await queryRunner.query(
            `CREATE INDEX ASYNC review_property_idx ON main.review (property_id);`
        );
        await queryRunner.query(
            `CREATE INDEX ASYNC review_host_idx ON main.review (host_id);`
        );
        await queryRunner.query(
            `CREATE INDEX ASYNC review_guest_idx ON main.review (guest_id);`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS main.review;`);
    }
}