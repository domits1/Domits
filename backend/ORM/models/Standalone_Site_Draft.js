import { EntitySchema } from "typeorm";

export const Standalone_Site_Draft = new EntitySchema({
  name: "Standalone_Site_Draft",
  tableName: "standalone_site_draft",
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
    template_key: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    status: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    content_overrides_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    theme_overrides_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    published_content_overrides_json: {
      type: "text",
      generated: false,
      nullable: true,
    },
    published_theme_overrides_json: {
      type: "text",
      generated: false,
      nullable: true,
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
    last_preview_built_at: {
      type: "bigint",
      generated: false,
      nullable: true,
      transformer: {
        from: (value) => (value === null || value === undefined ? null : Number(value)),
        to: (value) => value,
      },
    },
  },
});
