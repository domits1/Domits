import { EntitySchema } from "typeorm";

export const Standalone_Site_Event = new EntitySchema({
  name: "Standalone_Site_Event",
  tableName: "standalone_site_event",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    draft_id: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    property_id: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    host_id: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    event_type: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    payload_json: {
      type: "text",
      generated: false,
      nullable: true,
    },
    occurred_at: {
      type: "bigint",
      generated: false,
      nullable: false,
      transformer: {
        from: Number,
        to: (value) => value,
      },
    },
  },
});
