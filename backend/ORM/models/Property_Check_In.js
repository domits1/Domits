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
      name: "checkinfrom",
      type: "time",
      nullable: false,
    },
    checkInTill: {
      name: "checkintill",
      type: "time",
      nullable: false,
    },
    checkOutFrom: {
      name: "checkoutfrom",
      type: "time",
      nullable: false,
    },
    checkOutTill: {
      name: "checkouttill",
      type: "time",
      nullable: false,
    },
  },
});
