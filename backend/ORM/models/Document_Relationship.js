import { EntitySchema } from "typeorm";
import { createRequiredBigIntColumn, createRequiredVarcharColumn } from "./modelSchemaUtils.js";

export const Document_Relationship = new EntitySchema({
  name: "Document_Relationship",
  tableName: "document_relationship",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    document_id: { type: "uuid", nullable: false },
    host_id: createRequiredVarcharColumn({ length: 255 }),
    entity_type: createRequiredVarcharColumn({ length: 50 }),
    entity_id: createRequiredVarcharColumn({ length: 255 }),
    created_by: createRequiredVarcharColumn({ length: 255 }),
    created_at: createRequiredBigIntColumn(),
  },
});
