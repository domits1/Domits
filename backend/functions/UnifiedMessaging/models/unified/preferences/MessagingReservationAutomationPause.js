import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingReservationAutomationPause = new EntitySchema({
  name: "MessagingReservationAutomationPause",
  tableName: "messaging_reservation_automation_pause",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    bookingId: { type: "varchar", nullable: false },
    schedulerRuleId: { type: "varchar", nullable: true },
    isPaused: { type: "boolean", nullable: false, default: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
