import {EntitySchema} from "typeorm";

export const General_Details = new EntitySchema({
    name: "General_Details",
    tableName: "general_details",
    columns: {
        detail: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})