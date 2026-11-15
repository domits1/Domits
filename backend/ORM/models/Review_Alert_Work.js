import { EntitySchema } from "typeorm";
export const Review_Alert_Work = new EntitySchema({
  name: "Review_Alert_Work", tableName: "review_alert_work",
  columns: {
    id: { type: "varchar", length: 255, primary: true },
    payload: { type: "text" },
    due_at: { type: "bigint", nullable: true, transformer: { from: value => value == null ? null : Number(value), to: value => value } },
    version: { type: "int", default: 0 },
  },
});
