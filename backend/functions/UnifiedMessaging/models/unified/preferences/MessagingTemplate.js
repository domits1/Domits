import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const MessagingTemplate = new EntitySchema({
  name: "MessagingTemplate",
  tableName: "messaging_template",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    userId: { type: "varchar", nullable: false },
    name: { type: "varchar", nullable: false },
    category: { type: "varchar", nullable: true },
    language: { type: "varchar", nullable: false, default: "en" },
    content: { type: "text", nullable: false },
    isArchived: { type: "boolean", nullable: false, default: false },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
