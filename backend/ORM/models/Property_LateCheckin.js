import { EntitySchema } from "typeorm";

export const Property_LateCheckin = new EntitySchema({
  name: "Property_LateCheckin",
  tableName: "property_late_checkin",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    late_checkin_enabled: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    late_checkin_time: {
      type: "time",
      nullable: true,
    },
    late_checkout_enabled: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    late_checkout_time: {
      type: "time",
      nullable: true,
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
