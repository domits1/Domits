import {EntitySchema} from "typeorm";

export const Property_Location = new EntitySchema({
    name: "Property_Location",
    tableName: "property_location",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        city: {
            type: "varchar",
            nullable: false
        },
        country: {
            type: "varchar",
            nullable: false
        },
        housenumber: {
            type: "int",
            nullable: false
        },
        housenumberextension: {
            type: "varchar",
            nullable: true
        },
        postalcode: {
            type: "varchar",
            nullable: false
        },
        street: {
            type: "varchar",
            nullable: false
        },
    }
})