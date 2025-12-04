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
        roomrate: {
            type: "int",
            nullable: false
        },
        date: {
            type: "varchar",
            length: 10,
            nullable: true,
            default: null
        },
        price: {
            type: "int",
            nullable: true
        }
    }
})
