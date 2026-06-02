import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const UnifiedThreadNote = new EntitySchema({
  name: "UnifiedThreadNote",
  tableName: "unified_thread_note",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    threadId: { type: "varchar", nullable: false },
    authorUserId: { type: "varchar", nullable: false },
    content: { type: "text", nullable: false },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});