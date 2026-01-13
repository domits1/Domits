import {EntitySchema} from "typeorm";

export const Property = new EntitySchema({
    name: "Property",
    tableName: "property",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        title: {
            type: "varchar",
            nullable: false
        },
        subtitle: {
            type: "varchar",
            nullable: false
        },
        description: {
            type: "text",
            nullable: false
        },
        registrationnumber: {
            type: "varchar",
            nullable: false
        },
        hostid: {
            type: "varchar",
            nullable: false
        },
        status: {
            type: "varchar",
            nullable: false
        },
        createdat: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        updatedat: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
    }
})