import {EntitySchema} from "typeorm";

export const Property_Types = new EntitySchema({
    name: "Property_Types",
    tableName: "property_types",
    columns: {
        type: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})