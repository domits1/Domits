import { EntitySchema } from "typeorm";

export const Property_Draft = new EntitySchema({
  name: "Property_Draft",
  tableName: "property_draft",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    host_id: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    created_at: {
      type: "bigint",
      generated: false,
      nullable: false,
    },
    last_activity_at: {
      type: "bigint",
      generated: false,
      nullable: false,
    },
    name: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    address_line: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    property_type: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    capacity: {
      type: "int",
      generated: false,
      nullable: true,
    },
    bedrooms: {
      type: "int",
      generated: false,
      nullable: true,
    },
    bathrooms: {
      type: "int",
      generated: false,
      nullable: true,
    },
    status: {
      // Aurora DSQL cannot enforce NOT NULL on a column added to an existing
      // table (see docs/internal/tools/dsql_booking_columns_runbook.md), so this
      // is nullable at the database level even though every write path sets it.
      type: "varchar",
      generated: false,
      nullable: true,
      default: "DRAFT",
    },
  },
});
