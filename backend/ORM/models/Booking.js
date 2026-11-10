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
    total_price: {
      type: "double precision",
      name: "total_price",
      nullable: true,
      default: 0,
    },
    commissionable_accommodation_cents: {
      type: "bigint",
      name: "commissionable_accommodation_cents",
      transformer: {
        from: (value) => value !== null && value !== undefined ? Number(value) : null,
        to: (value) => value,
      },
      nullable: true,
    },
    commission_rate: {
      type: "numeric",
      name: "commission_rate",
      precision: 5,
      scale: 4,
      nullable: true,
    },
    commission_amount_cents: {
      type: "bigint",
      name: "commission_amount_cents",
      transformer: {
        from: (value) => value !== null && value !== undefined ? Number(value) : null,
        to: (value) => value,
      },
      nullable: true,
    },
    commission_annual_revenue_cents: {
      type: "bigint",
      name: "commission_annual_revenue_cents",
      transformer: {
        from: (value) => value !== null && value !== undefined ? Number(value) : null,
        to: (value) => value,
      },
      nullable: true,
    },
    commission_year: {
      type: "integer",
      name: "commission_year",
      nullable: true,
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
    booking_source: {
      type: "varchar",
      name: "booking_source",
      nullable: true,
    },
    site_id: {
      type: "varchar",
      name: "site_id",
      nullable: true,
    },
    guest_email: {
      type: "varchar",
      name: "guest_email",
      nullable: true,
    },
    public_booking_ref: {
      type: "varchar",
      name: "public_booking_ref",
      nullable: true,
    },
    idempotency_key: {
      type: "varchar",
      name: "idempotency_key",
      nullable: true,
    },
    checked_out_at: {
      type: "bigint",
      name: "checked_out_at",
      transformer: {
        from: (value) => value !== null && value !== undefined ? Number(value) : null,
        to: (value) => value,
      },
      nullable: true,
    },
    special_request: {
      type: "text",
      name: "special_request",
      nullable: true,
    },
    cancelled_at: {
      type: "bigint",
      name: "cancelled_at",
      transformer: {
        from: (value) => value !== null && value !== undefined ? Number(value) : null,
        to: (value) => value,
      },
      nullable: true,
    },
  },
});
