import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { GuestRiskAssessmentRepository } from "../../functions/Truvi-Integration/data/guestRiskAssessmentRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const buildUpdate = () => {
  const update = jest.fn(async () => undefined);
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => ({ update })) });
  return update;
};

describe("GuestRiskAssessmentRepository.saveTruviDates", () => {
  it("updates the dates and updatedAt, and the error message only when given", async () => {
    const update = buildUpdate();

    await new GuestRiskAssessmentRepository().saveTruviDates({ bookingId: "booking-1", arrivalDate: 1, departureDate: 2, now: 3 });

    expect(update).toHaveBeenCalledWith({ id: "truvi:booking-1" }, { arrivalDate: 1, departureDate: 2, updatedAt: 3 });
  });

  it("clears or sets the error message when it is passed", async () => {
    const update = buildUpdate();

    await new GuestRiskAssessmentRepository().saveTruviDates({
      bookingId: "booking-1",
      arrivalDate: 1,
      departureDate: 2,
      errorMessage: null,
      now: 3,
    });

    expect(update.mock.calls[0][1]).toEqual({ arrivalDate: 1, departureDate: 2, updatedAt: 3, errorMessage: null });
  });

  it("refuses to save without a booking id", async () => {
    await expect(new GuestRiskAssessmentRepository().saveTruviDates({})).rejects.toThrow("bookingId is required");
  });
});
