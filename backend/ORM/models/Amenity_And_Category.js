import {EntitySchema} from "typeorm";

export const Amenity_And_Category = new EntitySchema({
    name: "Amenity_And_Category",
    tableName: "amenity_and_category",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        amenity: {
            type: "varchar",
            nullable: false
        },
        category: {
            type: "varchar",
            nullable: false
        },
        ecoScore: {
            type: "varchar",
            nullable: false
        }
    }
})