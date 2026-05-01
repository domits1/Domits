import { EntitySchema } from "typeorm";

export const Standalone_Site = new EntitySchema({
  name: "Standalone_Site",
  tableName: "standalone_site",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    property_id: {
      type: "varchar",
      generated: false,
      nullable: false,
      unique: true,
    },
    host_id: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    site_name: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    primary_locale: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    status: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    template_key: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    published_property_snapshot_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    published_content_overrides_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    published_theme_overrides_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    preview_token_hash: {
      type: "varchar",
      generated: false,
      nullable: true,
    },
    published_at: {
      type: "bigint",
      generated: false,
      nullable: true,
      transformer: {
        from: (value) => (value === null || value === undefined ? null : Number(value)),
        to: (value) => value,
      },
    },
    suspended_at: {
      type: "bigint",
      generated: false,
      nullable: true,
      transformer: {
        from: (value) => (value === null || value === undefined ? null : Number(value)),
        to: (value) => value,
      },
    },
    created_at: {
      type: "bigint",
      generated: false,
      nullable: false,
      transformer: {
        from: Number,
        to: (value) => value,
      },
    },
    updated_at: {
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
