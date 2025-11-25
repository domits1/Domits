import {EntitySchema} from "typeorm";

export const Property_Availability = new EntitySchema({
    name: "Property_Availability",
    tableName: "property_availability",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        availablestartdate: {
            primary: true,
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        availableenddate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        status: {
            type: "varchar",
            length: 50,
            nullable: true,
            default: null
        },
        note: {
            type: "varchar",
            length: 500,
            nullable: true,
            default: null
        }
    }
})