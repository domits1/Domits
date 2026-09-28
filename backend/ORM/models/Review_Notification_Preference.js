import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

// Review: Stores whether a user wants automated review request and reminder emails.
export const Review_Notification_Preference = new EntitySchema({
  name: "Review_Notification_Preference",
  tableName: "review_notification_preference",
  columns: {
    userId: { name: "user_id", type: "varchar", primary: true },
    emailEnabled: { name: "email_enabled", type: "boolean", nullable: false, default: true },
    updatedAt: { name: "updated_at", type: "bigint", nullable: false, transformer: bigintTransformer },
  },
});
