import {EntitySchema} from "typeorm";

export const Property_General_Detail = new EntitySchema({
    name: "Property_GeneralDetail",
    tableName: "property_generaldetail",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        property_id: {
            type: "varchar",
            nullable: false
        },
        detail: {
            type: "varchar",
            nullable: false
        },
        value: {
            type: "int",
            nullable: false
        },
    }
})