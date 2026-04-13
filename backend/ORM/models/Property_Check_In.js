import { EntitySchema } from "typeorm";

export const Property_Check_In = new EntitySchema({
  name: "Property_CheckIn",
  tableName: "property_checkin",
  columns: {
    property_id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    checkInFrom: {
      type: "time",
      nullable: false,
    },
    checkInTill: {
      type: "time",
      nullable: false,
    },
    checkOutFrom: {
      type: "time",
      nullable: false,
    },
    checkOutTill: {
      type: "time",
      nullable: false,
    },
  },
});
