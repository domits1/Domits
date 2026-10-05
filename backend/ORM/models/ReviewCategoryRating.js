import { EntitySchema } from "typeorm";

export const ReviewCategoryRating = new EntitySchema({
  name: "ReviewCategoryRating",
  tableName: "review_category_rating",
  columns: {
    review_id: { type: "uuid", primary: true },
    category_key: { type: "varchar", primary: true },
    rating: { type: "double precision" },
  },
});
