import {EntitySchema} from "typeorm";

export const Property_Rule = new EntitySchema({
    name: "Property_Rule",
    tableName: "property_rule",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        rule: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        value: {
            type: "boolean",
            nullable: false
        },
    }
})