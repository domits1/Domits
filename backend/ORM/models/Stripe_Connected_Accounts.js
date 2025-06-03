import {EntitySchema} from "typeorm";

export const Stripe_Connected_Accounts = new EntitySchema({
    name: "Stripe_Connected_Accounts",
    tableName: "stripe_connected_accounts",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
            nullable: false
        },
        account_id: {
            type: "varchar",
            nullable: false
        },
        created_at: {
            type: "varchar",
            nullable: false
        },
        updated_at: {
            type: "varchar",
            nullable: false
        },
        user_id: {
            type: "varchar",
            nullable: false
        },
    }
})