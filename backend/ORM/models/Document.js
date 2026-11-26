import { EntitySchema } from "typeorm";
import {
  createNullableBigIntColumn,
  createNullableVarcharColumn,
  createRequiredBigIntColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Document = new EntitySchema({
  name: "Document",
  tableName: "document",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    host_id: createRequiredVarcharColumn({ length: 255 }),
    title: createRequiredVarcharColumn({ length: 255 }),
    description: { type: "text", nullable: true },
    category: createRequiredVarcharColumn({ length: 50 }),
    status: createRequiredVarcharColumn({ length: 20, default: "active" }),
    visibility: createRequiredVarcharColumn({ length: 20, default: "internal" }),
    review_status: createNullableVarcharColumn({ length: 20 }),
    current_version_id: { type: "uuid", nullable: true },
    issue_date: createNullableBigIntColumn(),
    expiration_date: createNullableBigIntColumn(),
    created_by: createRequiredVarcharColumn({ length: 255 }),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
    archived_at: createNullableBigIntColumn(),
    deleted_at: createNullableBigIntColumn(),
  },
});
