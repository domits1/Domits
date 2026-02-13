import { EntitySchema } from "typeorm";

export const Channel_Guest = new EntitySchema({
  name: "Channel_Guest",
  tableName: "channel_guest",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    channel_reservation_id: {
      type: "varchar",
      nullable: false,
    },
    fullname: {
      type: "varchar",
      nullable: false,
    },
    email: {
      type: "varchar",
      nullable: true,
    },
    phone: {
      type: "varchar",
      nullable: true,
    },
    country: {
      type: "varchar",
      nullable: true,
    },
    raw_guest: {
      type: "jsonb",
      nullable: true,
    },
  },
});

