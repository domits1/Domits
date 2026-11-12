import { EntitySchema } from "typeorm";
import {
  createNullableVarcharColumn,
  createRequiredBigIntColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Property_Owner = new EntitySchema({
  name: "Property_Owner",
  tableName: "property_owner",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    host_id: createRequiredVarcharColumn({ length: 255 }),
    first_name: createRequiredVarcharColumn({ length: 100 }),
    last_name: createRequiredVarcharColumn({ length: 100 }),
    company_name: createNullableVarcharColumn({ length: 200 }),
    email: createRequiredVarcharColumn({ length: 254 }),
    phone: createNullableVarcharColumn({ length: 50 }),
    preferred_language: createNullableVarcharColumn({ length: 10 }),
    owner_type: createRequiredVarcharColumn({ length: 20 }),
    status: createRequiredVarcharColumn({ length: 20, default: "active" }),
    notes: { type: "text", nullable: true },
    owner_user_id: createNullableVarcharColumn({ length: 255 }),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});
