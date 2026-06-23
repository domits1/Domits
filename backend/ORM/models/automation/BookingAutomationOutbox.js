import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const BookingAutomationOutbox = new EntitySchema({
  name: "BookingAutomationOutbox",
  tableName: "booking_automation_outbox",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    bookingId: { name: "bookingid", type: "varchar", nullable: false },
    eventType: { name: "eventtype", type: "varchar", nullable: false },
    eventVersion: { name: "eventversion", type: "int", nullable: false },
    occurredAt: { name: "occurredat", ...bigintNumber, nullable: false },
    status: { type: "varchar", nullable: false, default: "PENDING" },
    attemptCount: { name: "attemptcount", type: "int", nullable: false, default: 0 },
    failureReason: { name: "failurereason", type: "text", nullable: true },
    createdAt: { name: "createdat", ...bigintNumber, nullable: false },
    updatedAt: { name: "updatedat", ...bigintNumber, nullable: false },
    processedAt: { name: "processedat", ...bigintNumber, nullable: true },
  },
});
