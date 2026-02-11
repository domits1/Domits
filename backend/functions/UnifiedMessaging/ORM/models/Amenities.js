import {EntitySchema} from "typeorm";

export const Amenities = new EntitySchema({
    name: "Amenities",
    tableName: "amenities",
    columns: {
        amenity: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})