import { EntitySchema } from "typeorm";

export const Booking = new EntitySchema({
  name: "Booking",
  tableName: "booking",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
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
      nullable: false,
    },
    createdat: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    guestid: {
      type: "varchar",
      nullable: false,
    },
    guests: {
      type: "int",
      nullable: false,
    },
    hostid: {
      type: "varchar",
      nullable: false,
    },
    latepayment: {
      type: "boolean",
      nullable: false,
    },
    paymentid: {
      type: "varchar",
      nullable: false,
    },
    property_id: {
      type: "varchar",
      nullable: false,
    },
    status: {
      type: "varchar",
      nullable: false,
    },
    guestname: {
      type: "varchar",
      nullable: false,
    },
    hostname: {
      type: "varchar",
      nullable: false,
    },
    cancellation_policy: {
      type: "varchar",
      name: "cancellation_policy",
      nullable: true,
    },
    bookingtype: {
      type: "varchar",
      nullable: true,
      default: "direct",
    },
    refunded_amount: {
      type: "bigint",
      name: "refunded_amount",
      nullable: true,
      default: 0,
    },
    stripe_refund_id: {
      type: "varchar",
      name: "stripe_refund_id",
      nullable: true,
    },
    refund_error: {
      type: "text",
      name: "refund_error",
      nullable: true,
    },
  },
});
