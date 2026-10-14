import { EntitySchema } from "typeorm";
import {
  createNullableVarcharColumn,
  createRequiredBigIntColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Destination = new EntitySchema({
  name: "Destination",
  tableName: "destination",
  columns: {
    id: createRequiredVarcharColumn({ primary: true, length: 1024 }),
    type: createRequiredVarcharColumn({ length: 20 }),
    parent_id: createNullableVarcharColumn({ length: 1024 }),
    slug: createRequiredVarcharColumn({ length: 255 }),
    path: createRequiredVarcharColumn({ length: 1024 }),
    display_name: createRequiredVarcharColumn({ length: 255 }),
    country_code: createNullableVarcharColumn({ length: 2 }),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});

export const Property_Destination = new EntitySchema({
  name: "Property_Destination",
  tableName: "property_destination",
  columns: {
    property_id: createRequiredVarcharColumn({ primary: true, length: 255 }),
    destination_id: createRequiredVarcharColumn({ length: 1024 }),
    source_country: createRequiredVarcharColumn({ length: 255 }),
    source_city: createRequiredVarcharColumn({ length: 255 }),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});
