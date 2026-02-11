import {EntitySchema} from "typeorm";

export const Booking = new EntitySchema({
    name: "Booking",
    tableName: "booking",
    columns: {
        id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        arrivaldate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false,
        },
        departuredate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
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
        guestid: {
            type: "varchar",
            nullable: false
        },
        guests: {
            type: "int",
            nullable: false
        },
        hostid: {
            type: "varchar",
            nullable: false
        },
        latepayment: {
            type: "boolean",
            nullable: false
        },
        paymentid: {
            type: "varchar",
            nullable: false
        },
        property_id: {
            type: "varchar",
            nullable: false
        },
        status: {
            type: "varchar",
            nullable: false
        },
        guestname: {
            type: "varchar",
            nullable: false
        },
        hostname: {
            type: "varchar",
            nullable: false
        }
    }
})