import {EntitySchema} from "typeorm";

export const Availability_Restrictions = new EntitySchema({
    name: "Availability_Restrictions",
    tableName: "availability_restrictions",
    columns: {
        restriction: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
    }
})