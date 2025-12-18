import { EntitySchema } from "typeorm";

export const Property_Test_Status = new EntitySchema({
  name: "Property_Test_Status",
  tableName: "property_test_status",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    value: {
      type: "boolean",
      nullable: false,
    },
  },
});
