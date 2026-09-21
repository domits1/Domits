import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Category = new EntitySchema({
  name: "Review_Category",
  tableName: "review_category",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    key: { type: "varchar", nullable: false },
    label: { type: "varchar", nullable: false },
    description: { type: "text", nullable: true },
    reviewType: { name: "review_type", type: "varchar", nullable: false },
    isActive: { name: "is_active", type: "boolean", nullable: false, default: true },
    sortOrder: { name: "sort_order", type: "int", nullable: false, default: 0 },
    createdAt: {
      name: "created_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
    updatedAt: {
      name: "updated_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
  },
});