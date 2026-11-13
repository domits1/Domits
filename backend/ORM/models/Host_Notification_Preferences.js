import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => value !== null && value !== undefined ? Number(value) : null,
  to: (value) => value,
};

export const Host_Notification_Preferences = new EntitySchema({
  name: "Host_Notification_Preferences",
  tableName: "host_notification_preferences",
  columns: {
    user_id: { primary: true, type: "varchar", nullable: false },
    preferences: { type: "text", nullable: false, default: "{}" },
    created_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
    updated_at: { type: "bigint", nullable: false, transformer: bigintTransformer },
  },
});
