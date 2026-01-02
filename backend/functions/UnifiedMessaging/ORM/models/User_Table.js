import {EntitySchema} from "typeorm";

export const User_Table = new EntitySchema({
    name: "User_Table",
    tableName: "user_table",
    columns: {
        username: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        password: {
            type: "varchar",
            nullable: false
        },
    }
})