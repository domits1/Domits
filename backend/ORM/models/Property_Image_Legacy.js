import { EntitySchema } from "typeorm";

export const Property_Image_Legacy = new EntitySchema({
    name: "Property_Image_Legacy",
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
});