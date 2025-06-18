import {EntitySchema} from "typeorm";

export const Amenity_Categories = new EntitySchema({
    name: "Amenity_Categories",
    tableName: "amenity_categories",
    columns: {
        category: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})