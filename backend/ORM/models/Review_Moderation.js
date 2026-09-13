import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Moderation = new EntitySchema({
  name: "Review_Moderation",
  tableName: "review_moderation",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    targetType: { name: "target_type", type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "PENDING" },
    reason: { type: "varchar", nullable: true },
    notes: { type: "text", nullable: true },
    moderatedByUserId: { name: "moderated_by_user_id", type: "varchar", nullable: true },
    moderatedAt: {
      name: "moderated_at",
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