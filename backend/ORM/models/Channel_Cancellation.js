import { EntitySchema } from "typeorm";

export const Channel_Cancellation = new EntitySchema({
  name: "Channel_Cancellation",
  tableName: "channel_cancellation",
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
    type: {
      type: "varchar",
      nullable: false,
    },
    effectivedate: {
      type: "bigint",
      transformer: {
        from: (value) => Number(value),
        to: (value) => value,
      },
      nullable: false,
    },
    reason: {
      type: "varchar",
      nullable: true,
    },
    raw_cancellation: {
      type: "jsonb",
      nullable: true,
    },
  },
});

