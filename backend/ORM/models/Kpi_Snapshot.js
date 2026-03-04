import { EntitySchema } from "typeorm";

export const Kpi_Snapshot = new EntitySchema({
  name: "kpi_snapshot",
  tableName: "kpi_snapshot",
  schema: "main",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    user_id: {
      type: "varchar",
      length: 255,
    },

    host_id: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    period_type: {
      type: "varchar",
      length: 20,
    },

    period_start: {
      type: "timestamp",
      nullable: true,
    },

    period_end: {
      type: "timestamp",
      nullable: true,
    },

    created_at: {
      type: "timestamp",
      createDate: true,
      default: () => "NOW()",
    },

    revenue: { type: "numeric", nullable: true },
    booked_nights: { type: "int", nullable: true },
    available_nights: { type: "int", nullable: true },
    property_count: { type: "int", nullable: true },
    alos: { type: "numeric", nullable: true },
    adr: { type: "numeric", nullable: true },
    occupancy_rate: { type: "numeric", nullable: true },
    revpar: { type: "numeric", nullable: true },
  },
});