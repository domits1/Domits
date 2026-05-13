import { EntitySchema } from "typeorm";

export const Rules = new EntitySchema({
  name: "Rules",
  tableName: "rules",
  columns: {
    rule: {
      primary: true,
      type: "varchar",
      generated: false,
      nullable: false,
    },
    rule_name: {
      type: "varchar",
      nullable: true,
    },
    value_type: {
      type: "varchar",
      nullable: true,
    },
    value_text: {
      type: "varchar",
      nullable: true,
    },
    value_number: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
    },
  },
});
