import { EntitySchema } from "typeorm";

// Review: Converts stored category review ratings and timestamps into JS numbers.
const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

const numericTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Rating = new EntitySchema({
  // Review: Stores per-category scores such as cleanliness, location, check-in, and value.
  name: "Review_Rating",
  tableName: "review_rating",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    reviewId: { name: "review_id", type: "varchar", nullable: false },
    category: { type: "varchar", nullable: false },
    rating: {
      type: "numeric",
      precision: 2,
      scale: 1,
      nullable: false,
      transformer: numericTransformer,
    },
    createdAt: {
      name: "created_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
  },
});
