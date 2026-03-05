import { EntitySchema } from "typeorm";

export const Property_Image_Variant = new EntitySchema({
    name: "Property_Image_Variant",
    tableName: "property_image_variant",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        image_id: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        variant: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        s3_key: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        content_type: {
            type: "varchar",
            generated: false,
            nullable: false
        },
        bytes: {
            type: "int",
            generated: false,
            nullable: true
        },
        width: {
            type: "int",
            generated: false,
            nullable: true
        },
        height: {
            type: "int",
            generated: false,
            nullable: true
        },
    }
});