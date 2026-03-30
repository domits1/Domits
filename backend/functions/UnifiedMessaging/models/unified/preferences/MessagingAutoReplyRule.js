import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingAutoReplyRule = new EntitySchema({
  name: "MessagingAutoReplyRule",
  tableName: "messaging_auto_reply_rule",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    name: { type: "varchar", nullable: false },
    channel: { type: "varchar", nullable: false },
    keywordPattern: { type: "text", nullable: false },
    replyTemplateId: { type: "varchar", nullable: true },
    replyText: { type: "text", nullable: true },
    isEnabled: { type: "boolean", nullable: false, default: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
