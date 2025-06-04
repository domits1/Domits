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
        availableStartDate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        availableEndDate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
    }
})