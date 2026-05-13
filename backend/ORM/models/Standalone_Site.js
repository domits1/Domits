import { EntitySchema } from "typeorm";
import {
  createNullableBigIntColumn,
  createNullableVarcharColumn,
  createPrimaryVarcharIdColumn,
  createRequiredBigIntColumn,
  createRequiredTextColumn,
  createRequiredVarcharColumn,
} from "./modelSchemaUtils.js";

export const Standalone_Site = new EntitySchema({
  name: "Standalone_Site",
  tableName: "standalone_site",
  columns: {
    id: createPrimaryVarcharIdColumn(),
    property_id: createRequiredVarcharColumn({ unique: true }),
    host_id: createRequiredVarcharColumn(),
    site_name: createRequiredVarcharColumn(),
    primary_locale: createRequiredVarcharColumn(),
    status: createRequiredVarcharColumn(),
    template_key: createRequiredVarcharColumn(),
    published_property_snapshot_json: createRequiredTextColumn(),
    published_content_overrides_json: createRequiredTextColumn(),
    published_theme_overrides_json: createRequiredTextColumn(),
    preview_token_hash: createNullableVarcharColumn(),
    published_at: createNullableBigIntColumn(),
    suspended_at: createNullableBigIntColumn(),
    created_at: createRequiredBigIntColumn(),
    updated_at: createRequiredBigIntColumn(),
  },
});
