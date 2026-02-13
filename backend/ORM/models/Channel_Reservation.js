import { EntitySchema } from "typeorm";

export const Channel_Reservation = new EntitySchema({
  name: "Channel_Reservation",
  tableName: "channel_reservation",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    externalid: {
      type: "varchar",
      nullable: false,
    },
    channel: {
      type: "varchar",
      nullable: false,
    },
    version: {
      type: "varchar",
      nullable: false,
    },
    property_id: {
      type: "varchar",
      nullable: true,
    },
    booking_id: {
      type: "varchar",
      nullable: true,
    },
    status: {
      type: "varchar",
      nullable: false,
    },
    checkindate: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    checkoutdate: {
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
    updatedat: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    meta: {
      type: "jsonb",
      nullable: true,
    },
  },
});

