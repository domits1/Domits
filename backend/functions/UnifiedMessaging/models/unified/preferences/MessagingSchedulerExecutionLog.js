import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingSchedulerExecutionLog = new EntitySchema({
  name: "MessagingSchedulerExecutionLog",
  tableName: "messaging_scheduler_execution_log",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    executionType: { type: "varchar", nullable: false },
    userId: { type: "varchar", nullable: false },
    schedulerRuleId: { type: "varchar", nullable: true },
    bookingId: { type: "varchar", nullable: true },
    threadId: { type: "varchar", nullable: true },
    messageId: { type: "varchar", nullable: true },
    uniqueKey: { type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false },
    details: { type: "text", nullable: true },
    scheduledFor: { ...bigintNumber, nullable: true },
    executedAt: { ...bigintNumber, nullable: true },
    createdAt: { ...bigintNumber, nullable: false },
  },
});
