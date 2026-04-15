import { EntitySchema } from "typeorm";

export const Property_CancellationPolicy = new EntitySchema({
  name: "Property_CancellationPolicy",
  tableName: "property_cancellation_policy",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    policy_type: {
      type: "varchar",
      nullable: false,
    },
    created_at: {
      type: "bigint",
      nullable: false,
    },
    updated_at: {
      type: "bigint",
      nullable: false,
    },
  },
});
