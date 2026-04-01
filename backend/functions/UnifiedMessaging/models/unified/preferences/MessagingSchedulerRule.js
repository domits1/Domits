import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingSchedulerRule = new EntitySchema({
  name: "MessagingSchedulerRule",
  tableName: "messaging_scheduler_rule",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    name: { type: "varchar", nullable: false },
    channel: { type: "varchar", nullable: false },
    templateId: { type: "varchar", nullable: false },
    triggerType: { type: "varchar", nullable: false },
    offsetUnit: { type: "varchar", nullable: true },
    offsetValue: { type: "int", nullable: true },
    isEnabled: { type: "boolean", nullable: false, default: true },
    skipIfGuestResponded: { type: "boolean", nullable: false, default: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
