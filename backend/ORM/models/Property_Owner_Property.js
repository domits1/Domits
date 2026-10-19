import { EntitySchema } from "typeorm";
import { createRequiredBigIntColumn, createRequiredVarcharColumn } from "./modelSchemaUtils.js";

export const Property_Owner_Property = new EntitySchema({
  name: "Property_Owner_Property",
  tableName: "property_owner_property",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    owner_id: { type: "uuid", nullable: false },
    property_id: createRequiredVarcharColumn({ length: 255 }),
    host_id: createRequiredVarcharColumn({ length: 255 }),
    created_at: createRequiredBigIntColumn(),
  },
});
