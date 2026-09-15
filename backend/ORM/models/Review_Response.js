import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Response = new EntitySchema({
  name: "Review_Response",
  tableName: "review_response",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    responderUserId: { name: "responder_user_id", type: "varchar", nullable: false },
    publicResponse: { name: "public_response", type: "text", nullable: false },
    status: { type: "varchar", nullable: false, default: "SUBMITTED" },
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