import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const ChannelReservationLink = new EntitySchema({
  name: "ChannelReservationLink",
  tableName: "channel_reservation_link",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { type: "varchar", nullable: false },
    channel: { type: "varchar", nullable: false },
    externalReservationId: { type: "varchar", nullable: false },
    externalThreadId: { type: "varchar", nullable: true },
    domitsThreadId: { type: "varchar", nullable: true },
    domitsPropertyId: { type: "varchar", nullable: true },
    guestName: { type: "varchar", nullable: true },
    checkInAt: { ...bigintNumber, nullable: true },
    checkOutAt: { ...bigintNumber, nullable: true },
    reservationStatus: { type: "varchar", nullable: true },
    ratePlan: { type: "varchar", nullable: true },
    paymentStatus: { type: "varchar", nullable: true },
    rawPayload: { type: "text", nullable: true },
    createdAt: { ...bigintNumber, nullable: false },
    updatedAt: { ...bigintNumber, nullable: false },
  },
});