import { EntitySchema } from "typeorm";

export const Channel_Financial_Transaction = new EntitySchema({
  name: "Channel_Financial_Transaction",
  tableName: "channel_financial_transaction",
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
    totalamount: {
      type: "numeric",
      nullable: true,
    },
    currency: {
      type: "varchar",
      nullable: true,
    },
    taxamount: {
      type: "numeric",
      nullable: true,
    },
    feesamount: {
      type: "numeric",
      nullable: true,
    },
    multicurrency: {
      type: "boolean",
      nullable: false,
      default: false,
    },
    originalcurrency: {
      type: "varchar",
      nullable: true,
    },
    originalamount: {
      type: "numeric",
      nullable: true,
    },
    raw_financial: {
      type: "jsonb",
      nullable: true,
    },
  },
});

