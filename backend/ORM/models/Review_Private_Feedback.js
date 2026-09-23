import { EntitySchema } from "typeorm";

// Review: Converts private feedback timestamps from bigint storage into JS numbers.
const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Private_Feedback = new EntitySchema({
  // Review: Stores non-public feedback that is visible only to Domits internal reviewers.
  name: "Review_Private_Feedback",
  tableName: "review_private_feedback",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    reservationId: { name: "reservation_id", type: "varchar", nullable: false },
    guestId: { name: "guest_id", type: "varchar", nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    feedbackType: { name: "feedback_type", type: "varchar", nullable: false },
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
  },
});
