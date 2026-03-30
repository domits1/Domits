import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingPreference = new EntitySchema({
  name: "MessagingPreference",
  tableName: "messaging_preference",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    guestMessageEmailEnabled: { type: "boolean", nullable: false, default: true },
    autoReplyEmailEnabled: { type: "boolean", nullable: false, default: false },
    defaultResponseTimeTargetMinutes: { type: "int", nullable: true },
    businessHoursEnabled: { type: "boolean", nullable: false, default: false },
    businessHoursStart: { type: "time", nullable: true },
    businessHoursEnd: { type: "time", nullable: true },
    outOfOfficeEnabled: { type: "boolean", nullable: false, default: false },
    defaultMessageLanguage: { type: "varchar", nullable: false, default: "en" },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
