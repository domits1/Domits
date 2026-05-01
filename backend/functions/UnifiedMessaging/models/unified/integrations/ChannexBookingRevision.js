import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannexBookingRevision = new EntitySchema({
  name: "ChannexBookingRevision",
  tableName: "channex_booking_revision",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    domitsPropertyId: { type: "varchar", nullable: false },
    externalPropertyId: { type: "varchar", nullable: false },
    externalReservationId: { type: "varchar", nullable: false },
    revisionId: { type: "varchar", nullable: false },
    bookingStatus: { type: "varchar", nullable: true },
    arrivalDate: { type: "varchar", nullable: true },
    departureDate: { type: "varchar", nullable: true },
    guestSummary: { type: "varchar", nullable: true },
    rawPayload: { type: "text", nullable: true },
    acknowledgementState: { type: "varchar", nullable: false, default: "RECEIVED" },
    acknowledgedAt: { ...bigintNumber, nullable: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});
