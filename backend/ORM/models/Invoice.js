import { EntitySchema } from "typeorm";

export const Invoice = new EntitySchema({
  name: "Invoice",
  tableName: "invoice",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    invoice_number: {
      type: "varchar",
      length: 50,
      unique: true,
      nullable: false,
    },
    host_id: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    booking_id: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    property_id: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    property_name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    guest_name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    arrival_date: {
      type: "bigint",
      transformer: {
        from: Number,
        to: (value) => value,
      },
      nullable: false,
    },
    departure_date: {
      type: "bigint",
      transformer: {
        from: Number,
        to: (value) => value,
      },
      nullable: false,
    },
    nights: {
      type: "int",
      nullable: false,
    },
    rate_per_night: {
      type: "numeric",
      precision: 10,
      scale: 2,
      nullable: false,
    },
    gross_amount: {
      type: "numeric",
      precision: 10,
      scale: 2,
      nullable: false,
    },
    commission_amount: {
      type: "numeric",
      precision: 10,
      scale: 2,
      nullable: false,
    },
    net_amount: {
      type: "numeric",
      precision: 10,
      scale: 2,
      nullable: false,
    },
    status: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "finalized",
    },
    created_at: {
      type: "bigint",
      transformer: {
        from: Number,
        to: (value) => value,
      },
      nullable: false,
    },
  },
});
