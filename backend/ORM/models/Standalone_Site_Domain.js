import { EntitySchema } from "typeorm";
import {
  createNullableBigIntColumn,
  createPrimaryVarcharIdColumn,
  createRequiredBigIntColumn,
  createRequiredBooleanColumn,
  createRequiredTextColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Standalone_Site_Domain = new EntitySchema({
  name: "Standalone_Site_Domain",
  tableName: "standalone_site_domain",
  columns: {
    id: createPrimaryVarcharIdColumn(),
    site_id: createRequiredVarcharColumn(),
    domain: createRequiredVarcharColumn({ unique: true }),
    domain_type: createRequiredVarcharColumn(),
    status: createRequiredVarcharColumn(),
    is_primary: createRequiredBooleanColumn(),
    verification_details_json: createRequiredTextColumn(),
    last_checked_at: createNullableBigIntColumn(),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});
