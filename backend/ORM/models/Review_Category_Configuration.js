import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Category_Configuration = new EntitySchema({
  name: "Review_Category_Configuration",
  tableName: "review_category_configuration",
  uniques: [
    {
      name: "review_category_configuration_scope_unique",
      columns: ["propertyId", "reviewType", "categoryKey"],
    },
  ],
  indices: [
    {
      name: "review_category_configuration_property_idx",
      columns: ["propertyId", "reviewType"],
    },
  ],
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    hostId: { name: "host_id", type: "varchar", nullable: false },
    reviewType: { name: "review_type", type: "varchar", nullable: false },
    categoryKey: { name: "category_key", type: "varchar", nullable: false },
    isActive: { name: "is_active", type: "boolean", nullable: false, default: true },
    sortOrder: { name: "sort_order", type: "int", nullable: false, default: 0 },
    createdByUserId: { name: "created_by_user_id", type: "varchar", nullable: false },
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
