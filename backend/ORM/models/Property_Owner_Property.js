import { EntitySchema } from "typeorm";
import {
  createNullableBigIntColumn,
  createRequiredBigIntColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Property_Owner_Property = new EntitySchema({
  name: "Property_Owner_Property",
  tableName: "property_owner_property",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    owner_id: { type: "uuid", nullable: false },
    property_id: createRequiredVarcharColumn({ length: 255 }),
    host_id: createRequiredVarcharColumn({ length: 255 }),
    ownership_basis_points: { type: "int", nullable: false },
    effective_from: createRequiredBigIntColumn(),
    effective_to: createNullableBigIntColumn(),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});
