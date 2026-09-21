import { EntitySchema } from "typeorm";

const bigintTransformer = {
  from: (value) => (value !== null && value !== undefined ? Number(value) : null),
  to: (value) => value,
};

export const Review_Request = new EntitySchema({
  name: "Review_Request",
  tableName: "review_request",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    bookingId: { name: "booking_id", type: "varchar", nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    hostId: { name: "host_id", type: "varchar", nullable: false },
    guestId: { name: "guest_id", type: "varchar", nullable: false },
    reviewType: { name: "review_type", type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "OPEN" },
    requestedAt: {
      name: "requested_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
    expiresAt: {
      name: "expires_at",
      type: "bigint",
      nullable: false,
      transformer: bigintTransformer,
    },
    completedAt: {
      name: "completed_at",
      type: "bigint",
      nullable: true,
      transformer: bigintTransformer,
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