import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessageAutomationDelivery = new EntitySchema({
  name: "MessageAutomationDelivery",
  tableName: "message_automation_delivery",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    automationId: { name: "automationid", type: "varchar", nullable: false },
    bookingId: { name: "bookingid", type: "varchar", nullable: false },
    eventType: { name: "eventtype", type: "varchar", nullable: false },
    eventVersion: { name: "eventversion", type: "int", nullable: false },
    scheduledFor: { name: "scheduledfor", ...bigintNumber, nullable: false },
    status: { type: "varchar", nullable: false, default: "SCHEDULED" },
    messageId: { name: "messageid", type: "varchar", nullable: true },
    failureReason: { name: "failurereason", type: "text", nullable: true },
    templateSnapshot: { name: "templatesnapshot", type: "text", nullable: false },
    renderedContent: { name: "renderedcontent", type: "text", nullable: true },
    idempotencyKey: { name: "idempotencykey", type: "varchar", nullable: false },
    createdAt: { name: "createdat", ...bigintNumber, nullable: false },
    updatedAt: { name: "updatedat", ...bigintNumber, nullable: false },
    sentAt: { name: "sentat", ...bigintNumber, nullable: true },
  },
});
