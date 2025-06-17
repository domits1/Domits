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
            type: "int",
            nullable: false
        },
        checkintill: {
            type: "int",
            nullable: false
        },
        checkoutfrom: {
            type: "int",
            nullable: false
        },
        checkouttill: {
            type: "int",
            nullable: false
        },
    }
})