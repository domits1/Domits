import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => value !== null && value !== undefined ? Number(value) : null,
  to: (value) => value,
};

export const Review_Alert = new EntitySchema({
  name: "Review_Alert",
  tableName: "review_alert",
  columns: {
    id: { type: "varchar", length: 255, primary: true, nullable: false },
    recipient_user_id: { type: "varchar", length: 255, nullable: false },
    property_id: { type: "varchar", length: 255, nullable: false },
    review_id: { type: "varchar", length: 255, nullable: true },
    alert_type: { type: "varchar", length: 50, nullable: false },
    event_key: { type: "varchar", length: 255, nullable: false },
    status: { type: "varchar", length: 50, nullable: false, default: "UNREAD" },
    created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
  },
  uniques: [{ name: "review_alert_recipient_event_unique", columns: ["recipient_user_id", "event_key"] }],
  indices: [
    { name: "review_alert_recipient_created", columns: ["recipient_user_id", "created_at", "id"] },
    { name: "review_alert_property", columns: ["property_id"] },
    { name: "review_alert_review", columns: ["review_id"] },
  ],
});
