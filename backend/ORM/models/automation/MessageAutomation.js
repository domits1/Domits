import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessageAutomation = new EntitySchema({
  name: "MessageAutomation",
  tableName: "message_automation",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    hostId: { name: "hostid", type: "varchar", nullable: false },
    propertyId: { name: "propertyid", type: "varchar", nullable: true },
    name: { type: "varchar", nullable: false },
    triggerType: { name: "triggertype", type: "varchar", nullable: false },
    offsetAmount: { name: "offsetamount", type: "int", nullable: false, default: 0 },
    offsetUnit: { name: "offsetunit", type: "varchar", nullable: false },
    template: { type: "text", nullable: false },
    channel: { type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "DRAFT" },
    createdAt: { name: "createdat", ...bigintNumber, nullable: false },
    updatedAt: { name: "updatedat", ...bigintNumber, nullable: false },
  },
});
