// backend/ORM/models/Review.js

import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

const numericTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review = new EntitySchema({
  name: "Review",
  tableName: "review",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    bookingId: { name: "booking_id", type: "varchar", nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    hostId: { name: "host_id", type: "varchar", nullable: false },
    reviewerUserId: { name: "reviewer_user_id", type: "varchar", nullable: false },
    revieweeUserId: { name: "reviewee_user_id", type: "varchar", nullable: true },
    reviewType: { name: "review_type", type: "varchar", nullable: false },
    overallRating: {
      name: "overall_rating",
      type: "numeric",
      precision: 2,
      scale: 1,
      nullable: false,
      transformer: numericTransformer,
    },
    title: { type: "varchar", nullable: false },
    publicReview: { name: "public_review", type: "text", nullable: false },
    privateFeedback: { name: "private_feedback", type: "text", nullable: true },
    verificationStatus: {
      name: "verification_status",
      type: "varchar",
      nullable: false,
      default: "UNVERIFIED",
    },
    publicationStatus: {
      name: "publication_status",
      type: "varchar",
      nullable: false,
      default: "UNPUBLISHED",
    },
    status: {
      type: "varchar",
      nullable: false,
      default: "DRAFT",
    },
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