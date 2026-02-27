import { EntitySchema } from "typeorm";

export const Property_Calendar_Override = new EntitySchema({
  name: "Property_Calendar_Override",
  tableName: "property_calendar_override",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    calendar_date: {
      primary: true,
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    is_available: {
      type: "boolean",
      nullable: true,
    },
    nightly_price: {
      type: "int",
      nullable: true,
    },
    updated_at: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
  },
});
