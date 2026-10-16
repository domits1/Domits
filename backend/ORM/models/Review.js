
import { EntitySchema } from "typeorm";

const bigintTransformer = {
    from: (value) => value !== null && value !== undefined ? Number(value) : null,
    to: (value) => value,
};

export const Review = new EntitySchema({
    name: "Review",
    tableName: "review",
    columns: {
        id: { primary: true, type: "varchar", length: 255, generated: false, nullable: false },
        booking_id: { type: "varchar", length: 255, nullable: false },
        property_id: { type: "varchar", length: 255, nullable: false },
        host_id: { type: "varchar", length: 255, nullable: false },
        reviewer_user_id: { type: "varchar", length: 255, nullable: false },
        reviewee_user_id: { type: "varchar", length: 255, nullable: true },
        review_type: { type: "varchar", length: 50, nullable: false },
        overall_rating: { type: "numeric", precision: 2, scale: 1, nullable: false, transformer: bigintTransformer },
        title: { type: "varchar", length: 255, nullable: false },
        public_review: { type: "text", nullable: false },
        private_feedback: { type: "text", nullable: true },
        verification_status: { type: "varchar", length: 50, nullable: false, default: "UNVERIFIED" },
        publication_status: { type: "varchar", length: 50, nullable: false, default: "UNPUBLISHED" },
        status: { type: "varchar", length: 50, nullable: false, default: "DRAFT" },
        created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
        updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    },
});
