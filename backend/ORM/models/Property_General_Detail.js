import {EntitySchema} from "typeorm";

export const PROPERTY_GENERAL_DETAIL_TABLE_NAMES = Object.freeze({
    current: "property_generaldetail",
    canonical: "property_general_detail"
});

export const Property_General_Detail = new EntitySchema({
    name: "Property_GeneralDetail",
    tableName: PROPERTY_GENERAL_DETAIL_TABLE_NAMES.current,
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
