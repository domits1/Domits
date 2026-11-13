import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { GuestRiskAssessmentRepository } from "../../functions/Truvi-Integration/data/guestRiskAssessmentRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const buildRepository = ({ existing = null } = {}) => {
  const findOne = jest.fn(async () => existing);
  const save = jest.fn(async (row) => row);
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => ({ findOne, save })) });
  return { repository: new GuestRiskAssessmentRepository(), findOne, save };
};

describe("GuestRiskAssessmentRepository.saveResult", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves a new Truvi result with the booking id in the row id", async () => {
    const { repository, findOne, save } = buildRepository();

    await repository.saveResult({
      bookingId: "booking-1",
      result: { providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null },
      now: 1000,
    });

    expect(findOne).toHaveBeenCalledWith({ where: { id: "truvi:booking-1" } });
    expect(save).toHaveBeenCalledWith({
      id: "truvi:booking-1",
      provider: "truvi",
      bookingId: "booking-1",
      providerAssessmentId: "v-1",
      status: "PASSED",
      flaggedReason: null,
      errorMessage: null,
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  it("keeps the original createdAt when the same booking is saved again", async () => {
    const { repository, save } = buildRepository({ existing: { id: "truvi:booking-1", createdAt: 500 } });

    await repository.saveResult({
      bookingId: "booking-1",
      result: { providerAssessmentId: "v-1", status: "FLAGGED", flaggedReason: "Invalid Email" },
      now: 2000,
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FLAGGED", flaggedReason: "Invalid Email", createdAt: 500, updatedAt: 2000 })
    );
  });

  it("stores the error message of an ERROR result", async () => {
    const { repository, save } = buildRepository();

    await repository.saveResult({
      bookingId: "booking-1",
      result: { providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status: 503, message: "Service Unavailable" } },
      now: 1000,
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ERROR", providerAssessmentId: null, errorMessage: "Service Unavailable" })
    );
  });

  it("refuses to save without a booking id", async () => {
    const { repository, save } = buildRepository();

    await expect(repository.saveResult({ result: { status: "PASSED" } })).rejects.toThrow("bookingId is required");
    expect(save).not.toHaveBeenCalled();
  });
});

describe("GuestRiskAssessmentRepository.findByBooking", () => {
  it("looks up the row by provider and booking id", async () => {
    const row = { id: "truvi:booking-1", status: "PASSED" };
    const { repository, findOne } = buildRepository({ existing: row });

    const found = await repository.findByBooking({ bookingId: "booking-1" });

    expect(findOne).toHaveBeenCalledWith({ where: { id: "truvi:booking-1" } });
    expect(found).toBe(row);
  });
});