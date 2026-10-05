import { EntitySchema } from "typeorm";

export const ReviewCategory = new EntitySchema({
  name: "ReviewCategory",
  tableName: "review_category",
  columns: {
    key: { type: "varchar", primary: true },
    label: { type: "varchar" },
    active: { type: "boolean", default: true },
  },
});
