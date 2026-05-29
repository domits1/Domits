import { EntitySchema } from "typeorm";

export const PriceLabs_Connection = new EntitySchema({
  name: "PriceLabs_Connection",
  tableName: "pricelabs_connection",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    host_id: {
      type: "varchar",
      nullable: false,
    },
    pricelabs_email: {
      type: "varchar",
      nullable: false,
      comment: "The host's registered PriceLabs account email (user_token for listing pushes)",
    },
    is_active: {
      type: "boolean",
      default: true,
      nullable: false,
    },
    connected_at: {
      type: "bigint",
      nullable: false,
      transformer: { from: Number, to: (v) => v },
    },
    last_listings_sync_at: {
      type: "bigint",
      nullable: true,
      transformer: { from: Number, to: (v) => v },
    },
    last_calendar_sync_at: {
      type: "bigint",
      nullable: true,
      transformer: { from: Number, to: (v) => v },
    },
    last_reservations_sync_at: {
      type: "bigint",
      nullable: true,
      transformer: { from: Number, to: (v) => v },
    },
    last_sync_status: {
      type: "varchar",
      nullable: true,
      comment: "connected | synced | error",
    },
    last_sync_error: {
      type: "text",
      nullable: true,
    },
  },
  indices: [
    { columns: ["host_id"], unique: true },
  ],
});
