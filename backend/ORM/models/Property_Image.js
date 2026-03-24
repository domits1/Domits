import {EntitySchema} from "typeorm";

export const Property_Image = new EntitySchema({
    name: "Property_Image",
    tableName: "property_image_v2",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        property_id: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        sort_order: {
            type: "int",
            generated: false,
            nullable: false
        },
        status: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        created_at: {
            type: "bigint",
            generated: false,
            nullable: false
        },
        updated_at: {
            type: "bigint",
            generated: false,
            nullable: false
        },
    }
})
