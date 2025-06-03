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
        arrivalDate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false,
        },
        departureDate: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        createdAt: {
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false
        },
        guestId: {
            type: "varchar",
            nullable: false
        },
        guests: {
            type: "int",
            nullable: false
        },
        hostId: {
            type: "varchar",
            nullable: false
        },
        latePayment: {
            type: "boolean",
            nullable: false
        },
        paymentId: {
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
    }
})