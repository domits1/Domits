import { EntitySchema } from "typeorm";

// Review: Converts host response lifecycle timestamps from bigint storage into JS numbers.
const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Response = new EntitySchema({
  // Review: Stores the host or property-manager reply attached to one public review.
  name: "Review_Response",
  tableName: "review_response",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    authorId: { name: "author_id", type: "varchar", nullable: false },
    authorRole: { name: "author_role", type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "draft" },
    message: { type: "text", nullable: false },
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
    publishedAt: {
      name: "published_at",
      type: "bigint",
      nullable: true,
      transformer: bigintTransformer,
    },
    deletedAt: {
      name: "deleted_at",
      type: "bigint",
      nullable: true,
      transformer: bigintTransformer,
    },
  },
});
