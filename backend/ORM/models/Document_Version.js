import { EntitySchema } from "typeorm";
import {
  createNullableVarcharColumn,
  createRequiredBigIntColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Document_Version = new EntitySchema({
  name: "Document_Version",
  tableName: "document_version",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    document_id: { type: "uuid", nullable: false },
    host_id: createRequiredVarcharColumn({ length: 255 }),
    version_number: { type: "int", nullable: false },
    storage_key: createRequiredVarcharColumn({ length: 1024 }),
    file_name: createRequiredVarcharColumn({ length: 255 }),
    mime_type: createRequiredVarcharColumn({ length: 100 }),
    file_size: createRequiredBigIntColumn(),
    checksum: createNullableVarcharColumn({ length: 128 }),
    uploaded_by: createRequiredVarcharColumn({ length: 255 }),
    change_description: { type: "text", nullable: true },
    created_at: createRequiredBigIntColumn(),
  },
});
