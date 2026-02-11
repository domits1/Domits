import {EntitySchema} from "typeorm";

export const Payment = new EntitySchema({
    name: "Payment",
    tableName: "payment",
    columns: {
        stripepaymentid: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        stripeclientsecret: {
            type: "varchar",
            nullable: false
        },
    }
})