import { EntitySchema } from "typeorm";

export const Standalone_Site_Domain = new EntitySchema({
  name: "Standalone_Site_Domain",
  tableName: "standalone_site_domain",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    site_id: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    domain: {
      type: "varchar",
      generated: false,
      nullable: false,
      unique: true,
    },
    domain_type: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    status: {
      type: "varchar",
      generated: false,
      nullable: false,
    },
    is_primary: {
      type: "boolean",
      generated: false,
      nullable: false,
    },
    verification_details_json: {
      type: "text",
      generated: false,
      nullable: false,
    },
    last_checked_at: {
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
