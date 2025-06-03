import {EntitySchema} from "typeorm";

export const Property_Amenity = new EntitySchema({
    name: "Property_Amenity",
    tableName: "property_amenity",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        amenityId: {
            type: "varchar",
            nullable: false
        },
        property_id: {
            type: "varchar",
            nullable: false
        },
    }
})