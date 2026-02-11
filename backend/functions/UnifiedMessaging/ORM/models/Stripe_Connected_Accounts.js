import {EntitySchema} from "typeorm";

export const Stripe_Connected_Accounts = new EntitySchema({
    name: "Stripe_ConnectedAccounts",
    tableName: "stripe_connectedaccounts",
    columns: {
        id: {
            primary: true,
            type: "int",
        },
        account_id: {
            type: "varchar",
        },
        created_at: {
            type: "timestamp",
            createDate: true
        },
        updated_at: {
            type: "timestamp",
            updateDate: true
        },
        user_id: {
            type: "varchar",
        },
    }
})