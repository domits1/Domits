import {EntitySchema} from "typeorm";

export const Property_Check_In = new EntitySchema({
    name: "Property_CheckIn",
    tableName: "property_checkin",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        checkinfrom: {
            type: "time",
            nullable: false
        },
        checkintill: {
            type: "time",
            nullable: false
        },
        checkoutfrom: {
            type: "time",
            nullable: false
        },
        checkouttill: {
            type: "time",
            nullable: false
        },
    }
})