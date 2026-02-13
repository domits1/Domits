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
  },
});
