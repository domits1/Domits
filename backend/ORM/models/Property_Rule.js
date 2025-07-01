import {EntitySchema} from "typeorm";

export const Property_Rule = new EntitySchema({
    name: "Property_Rule",
    tableName: "property_rule",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        propertyId: {
            type: "varchar",
            nullable: false
        },
        rule: {
            type: "varchar",
            nullable: false
        },
        value: {
            type: "boolean",
            nullable: false
        },
    }
})