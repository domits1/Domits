import { EntitySchema } from "typeorm";
import { createRequiredBigIntColumn, createRequiredVarcharColumn } from "./modelSchemaUtils.js";

export const Document_Activity = new EntitySchema({
  name: "Document_Activity",
  tableName: "document_activity",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    document_id: { type: "uuid", nullable: false },
    host_id: createRequiredVarcharColumn({ length: 255 }),
    actor_id: createRequiredVarcharColumn({ length: 255 }),
    action: createRequiredVarcharColumn({ length: 50 }),
    details: { type: "text", nullable: true },
    created_at: createRequiredBigIntColumn(),
  },
});
