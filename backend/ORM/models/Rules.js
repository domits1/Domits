import {EntitySchema} from "typeorm";

export const Rules = new EntitySchema({
    name: "Rules",
    tableName: "rules",
    columns: {
        rule: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})