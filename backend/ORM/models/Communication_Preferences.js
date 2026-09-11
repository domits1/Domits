import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => value !== null && value !== undefined ? Number(value) : null,
  to: (value) => value,
};

export const Communication_Preferences = new EntitySchema({
  name: "Communication_Preferences",
  tableName: "communication_preferences",
  columns: {
    user_id: { primary: true, type: "varchar", nullable: false },
    persona: { primary: true, type: "varchar", nullable: false },
    reservation_email: { type: "boolean", default: true, nullable: false },
    reservation_sms: { type: "boolean", default: false, nullable: false },
    reservation_push: { type: "boolean", default: true, nullable: false },
    cancellation_email: { type: "boolean", default: true, nullable: false },
    cancellation_sms: { type: "boolean", default: true, nullable: false },
    cancellation_push: { type: "boolean", default: true, nullable: false },
    messages_email: { type: "boolean", default: true, nullable: false },
    messages_sms: { type: "boolean", default: false, nullable: false },
    messages_push: { type: "boolean", default: true, nullable: false },
    created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
  },
});
