import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { GuestRiskAssessmentRepository } from "../../functions/Truvi-Integration/data/guestRiskAssessmentRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe("GuestRiskAssessmentRepository.saveCancellation", () => {
  it("updates only the status, error message and updatedAt of the Truvi row", async () => {
    const update = jest.fn(async () => undefined);
    Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => ({ update })) });

    await new GuestRiskAssessmentRepository().saveCancellation({
      bookingId: "booking-1",
      status: "CANCEL_REFUSED",
      errorMessage: "checkIn is in the past, and can no longer be cancelled.",
      now: 2000,
    });

    expect(update).toHaveBeenCalledWith(
      { id: "truvi:booking-1" },
      { status: "CANCEL_REFUSED", errorMessage: "checkIn is in the past, and can no longer be cancelled.", updatedAt: 2000 }
    );
  });

  it("refuses to save without a booking id", async () => {
    await expect(new GuestRiskAssessmentRepository().saveCancellation({ status: "CANCELLED" })).rejects.toThrow(
      "bookingId is required"
    );
  });
});
