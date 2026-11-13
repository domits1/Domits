import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

export const GuestRiskAssessment = new EntitySchema({
  name: "GuestRiskAssessment",
  tableName: "guest_risk_assessment",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    provider: { type: "varchar", nullable: false },
    bookingId: { name: "bookingid", type: "varchar", nullable: false },
    providerAssessmentId: { name: "providerassessmentid", type: "varchar", nullable: true },
    status: { type: "varchar", nullable: false },
    flaggedReason: { name: "flaggedreason", type: "text", nullable: true },
    errorMessage: { name: "errormessage", type: "text", nullable: true },
    arrivalDate: { name: "arrivaldate", ...bigintNumber, nullable: true },
    departureDate: { name: "departuredate", ...bigintNumber, nullable: true },
    createdAt: { name: "createdat", ...bigintNumber, nullable: false },
    updatedAt: { name: "updatedat", ...bigintNumber, nullable: false },
  },
});