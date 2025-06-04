import {EntitySchema} from "typeorm";

export const Payment = new EntitySchema({
    name: "Payment",
    tableName: "payment",
    columns: {
        stripePaymentId: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        stripeClientSecret: {
            type: "varchar",
            nullable: false
        },
    }
})