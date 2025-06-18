import {EntitySchema} from "typeorm";

export const Property_Image = new EntitySchema({
    name: "Property_Image",
    tableName: "property_image",
    columns: {
        key: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})