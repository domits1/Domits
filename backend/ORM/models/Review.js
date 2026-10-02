
import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Review = new EntitySchema({
    name: "Review",
    tableName: "review",
    columns: {
        id: { primary: true, type: "uuid", generated: "uuid" },
        reservation_id: { type: "varchar", nullable: false },
        property_id: { type: "varchar", nullable: false },
        host_id: { type: "varchar", nullable: false },
        guest_id: { type: "varchar", nullable: false },
        overall_rating: { type: "double precision", nullable: false },
        public_review: { type: "text", nullable: true },
        private_feedback: { type: "text", nullable: true },
        verification_status: { type: "varchar", nullable: false, default: "pending" },
        publication_status: { type: "varchar", nullable: false, default: "draft" },
        created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    },
});