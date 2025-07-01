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
        checkInFrom: {
            type: "int",
            nullable: false
        },
        checkInTill: {
            type: "int",
            nullable: false
        },
        checkOutFrom: {
            type: "int",
            nullable: false
        },
        checkOutTill: {
            type: "int",
            nullable: false
        },
    }
})