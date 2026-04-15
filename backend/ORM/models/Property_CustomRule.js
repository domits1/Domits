import { EntitySchema } from "typeorm";

export const Property_CustomRule = new EntitySchema({
  name: "Property_CustomRule",
  tableName: "property_custom_rules",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    property_id: {
      type: "varchar",
      nullable: false,
    },
    category: {
      type: "varchar",
      nullable: false,
    },
    rule_text: {
      type: "text",
      nullable: false,
    },
    enabled: {
      type: "boolean",
      nullable: false,
      default: true,
    },
    created_at: {
      type: "bigint",
      nullable: false,
    },
  },
});
