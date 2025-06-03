import {EntitySchema} from "typeorm";

export const Property_Type = new EntitySchema({
    name: "Property_Type",
    tableName: "property_type",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        type: {
            type: "varchar",
            nullable: false
        },
        spaceType: {
            type: "varchar",
            nullable: false
        },
    }
})