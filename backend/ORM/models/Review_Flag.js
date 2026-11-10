import { EntitySchema } from "typeorm";

const timestamp = {
  type: "bigint",
  transformer: { from: (value) => Number(value), to: (value) => value },
};

export const Review_Flag = new EntitySchema({
  name: "Review_Flag",
  tableName: "review_flag",
  columns: {
    id: { type: "varchar", primary: true },
    review_id: { type: "varchar" },
    flagged_by: { type: "varchar" },
    reason: { type: "varchar" },
    notes: { type: "text", nullable: true },
    status: { type: "varchar", default: "PENDING" },
    created_at: timestamp,
    updated_at: timestamp,
    resolved_by: { type: "varchar", nullable: true },
  },
});
