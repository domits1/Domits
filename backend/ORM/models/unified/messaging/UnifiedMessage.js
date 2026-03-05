import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const UnifiedMessage = new EntitySchema({
  name: "UnifiedMessage",
  tableName: "unified_message",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    threadId: {
      type: "varchar",
      nullable: false,
    },
    senderId: {
      type: "varchar",
      nullable: false,
    },
    recipientId: {
      type: "varchar",
      nullable: false,
    },
    content: {
      type: "text",
      nullable: false,
    },
    platformMessageId: {
      type: "varchar",
      nullable: true,
    },
    createdAt: {
      ...bigintNumber,
      nullable: false,
    },
    isRead: {
      type: "boolean",
      default: false,
      nullable: true,
    },
    metadata: {
      type: "text",
      nullable: true,
    },
    attachments: {
      type: "text",
      nullable: true,
    },
    deliveryStatus: {
      type: "varchar",
      default: "pending",
      nullable: true,
    },
    
    direction: {
      name: "direction",
      type: "varchar",
      nullable: true,
    },
    externalCreatedAt: {
      name: "externalCreatedAt",
      ...bigintNumber,
      nullable: true,
    },
    externalSenderType: {
      name: "externalSenderType",
      type: "varchar",
      nullable: true,
    },
    complianceStatus: {
      name: "complianceStatus",
      type: "varchar",
      nullable: true,
    },
    errorCode: {
      name: "errorCode",
      type: "varchar",
      nullable: true,
    },
    errorMessage: {
      name: "errorMessage",
      type: "text",
      nullable: true,
    },
  },
});