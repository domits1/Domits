import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Verification = new EntitySchema({
  name: "Review_Verification",
  tableName: "review_verification",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    bookingId: { name: "booking_id", type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "VERIFIED_STAY" },
    method: { type: "varchar", nullable: false, default: "BOOKING_MATCH" },
    evidenceJson: { name: "evidence_json", type: "text", nullable: true },
    verifiedAt: {
      name: "verified_at",
      type: "bigint",
      nullable: true,
      transformer: bigintTransformer,
    },
    createdAt: {
      name: "created_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
    updatedAt: {
      name: "updated_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
  },
});