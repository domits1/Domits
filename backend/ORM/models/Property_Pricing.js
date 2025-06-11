import {EntitySchema} from "typeorm";

export const Property_Pricing = new EntitySchema({
    name: "Property_Pricing",
    tableName: "property_pricing",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        cleaning: {
            type: "int",
            nullable: true
        },
        roomRate: {
            type: "int",
            nullable: false
        },
    }
})