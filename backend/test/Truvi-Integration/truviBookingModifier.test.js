import { describe, expect, it, jest } from "@jest/globals";
import { classifyModifyError, TruviBookingModifier } from "../../functions/Truvi-Integration/business/truviBookingModifier.js";
import { TruviApiError } from "../../functions/Truvi-Integration/data/truviApiClient.js";

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const VERIFICATION_ID = "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1";

const verification = (overrides = {}) => ({
  bookingId: "booking-1",
  verificationId: VERIFICATION_ID,
  sent: { arrivaldate: Date.UTC(2026, 10, 18), departuredate: Date.UTC(2026, 10, 22) },
  current: { arrivaldate: Date.UTC(2026, 10, 20), departuredate: Date.UTC(2026, 10, 24) },
  ...overrides,
});

const build = ({ verifications = [verification()], modify } = {}) => {
  const bookingRepository = { listVerificationsToModify: jest.fn(async () => verifications) };
  const apiClient = { modifyVerification: jest.fn(modify || (async () => ({ metadata: {} }))) };
  const assessmentRepository = {
    saveTruviDates: jest.fn(async () => undefined),
    markAttempt: jest.fn(async () => undefined),
  };
  const modifier = new TruviBookingModifier({ bookingRepository, apiClient, assessmentRepository });
  return { modifier, bookingRepository, apiClient, assessmentRepository };
};

const failWith = (status, message) => async () => {
  throw new TruviApiError(status, message);
};

describe("TruviBookingModifier", () => {
  it("sends both new dates to Truvi and saves them as the dates Truvi has", async () => {
    const { modifier, bookingRepository, apiClient, assessmentRepository } = build();

    const summary = await modifier.run({ limit: 5, now: NOW });

    expect(bookingRepository.listVerificationsToModify).toHaveBeenCalledWith({ now: NOW, limit: 5 });
    const request = apiClient.modifyVerification.mock.calls[0][0];
    expect(request.verification).toEqual({ verificationId: VERIFICATION_ID });
    expect(request.reservation).toEqual({ reservationId: "booking-1", checkIn: "2026-11-20", checkOut: "2026-11-24" });
    expect(request.metadata.echoToken).toHaveLength(36);
    expect(assessmentRepository.saveTruviDates).toHaveBeenCalledWith({
      bookingId: "booking-1",
      arrivalDate: Date.UTC(2026, 10, 20),
      departureDate: Date.UTC(2026, 10, 24),
      errorMessage: null,
      now: NOW,
    });
    expect(summary).toEqual({ listed: 1, modified: 1, recorded: 0, refused: 0, retryLater: 0, gaveUp: 0, errors: [] });
  });

  it("only records the dates of a row that has none yet, without calling Truvi", async () => {
    const { modifier, apiClient, assessmentRepository } = build({
      verifications: [verification({ sent: { arrivaldate: null, departuredate: null } })],
    });

    const summary = await modifier.run({ now: NOW });

    expect(apiClient.modifyVerification).not.toHaveBeenCalled();
    expect(assessmentRepository.saveTruviDates).toHaveBeenCalledWith({
      bookingId: "booking-1",
      arrivalDate: Date.UTC(2026, 10, 20),
      departureDate: Date.UTC(2026, 10, 24),
      now: NOW,
    });
    expect(summary.recorded).toBe(1);
  });

  it("does not call Truvi when only the time of day changed, because Truvi only has dates", async () => {
    const { modifier, apiClient, assessmentRepository } = build({
      verifications: [
        verification({
          current: { arrivaldate: Date.UTC(2026, 10, 18, 15), departuredate: Date.UTC(2026, 10, 22, 11) },
        }),
      ],
    });

    const summary = await modifier.run({ now: NOW });

    expect(apiClient.modifyVerification).not.toHaveBeenCalled();
    expect(assessmentRepository.saveTruviDates).toHaveBeenCalledTimes(1);
    expect(summary.recorded).toBe(1);
  });

  it("records the dates with the reason when Truvi refuses, so it is not sent again", async () => {
    const { modifier, assessmentRepository } = build({
      modify: failWith(400, "checkIn already in past cannot be modified."),
    });

    const summary = await modifier.run({ now: NOW });

    expect(assessmentRepository.saveTruviDates).toHaveBeenCalledWith({
      bookingId: "booking-1",
      arrivalDate: Date.UTC(2026, 10, 20),
      departureDate: Date.UTC(2026, 10, 24),
      errorMessage: "Truvi refused: cannot be modified",
      now: NOW,
    });
    expect(summary.refused).toBe(1);
  });

  it("moves the booking to the back of the queue on a timeout or a 5xx, without saving the dates", async () => {
    const { modifier, assessmentRepository } = build({
      verifications: [verification(), verification({ bookingId: "booking-2" })],
      modify: jest
        .fn()
        .mockRejectedValueOnce(new TruviApiError(null, "Truvi did not answer within 10000 ms"))
        .mockRejectedValueOnce(new TruviApiError(502, "Bad gateway")),
    });

    const summary = await modifier.run({ now: NOW });

    expect(assessmentRepository.saveTruviDates).not.toHaveBeenCalled();
    expect(assessmentRepository.markAttempt.mock.calls).toEqual([
      [{ bookingId: "booking-1", now: NOW }],
      [{ bookingId: "booking-2", now: NOW }],
    ]);
    expect(summary.retryLater).toBe(2);
  });

  it("reports an unexpected 400 as an error, counts it and moves the booking to the back of the queue", async () => {
    const { modifier, assessmentRepository } = build({
      verifications: [verification(), verification({ bookingId: "booking-2", failedAttempts: 1 })],
      modify: failWith(400, "checkIn must be before checkOut."),
    });

    const summary = await modifier.run({ now: NOW });

    expect(assessmentRepository.saveTruviDates).not.toHaveBeenCalled();
    expect(assessmentRepository.markAttempt.mock.calls).toEqual([
      [{ bookingId: "booking-1", failedAttempts: 1, now: NOW }],
      [{ bookingId: "booking-2", failedAttempts: 2, now: NOW }],
    ]);
    expect(summary.errors).toEqual([
      { bookingId: "booking-1", message: "Truvi refused the request with status 400" },
      { bookingId: "booking-2", message: "Truvi refused the request with status 400" },
    ]);
    expect(summary.gaveUp).toBe(0);
  });

  it("stops sending a date change after the third unexpected answer, and saves it with the fixed message", async () => {
    const { modifier, apiClient, assessmentRepository } = build({
      verifications: [verification({ failedAttempts: 2 })],
      modify: failWith(400, "Guest Jane Doe jane@example.com is not valid."),
    });

    const summary = await modifier.run({ now: NOW });

    expect(apiClient.modifyVerification).toHaveBeenCalledTimes(1);
    expect(assessmentRepository.markAttempt).not.toHaveBeenCalled();
    expect(assessmentRepository.saveTruviDates).toHaveBeenCalledWith({
      bookingId: "booking-1",
      arrivalDate: Date.UTC(2026, 10, 20),
      departureDate: Date.UTC(2026, 10, 24),
      errorMessage: "Truvi refused the request with status 400",
      now: NOW,
    });
    expect(summary.gaveUp).toBe(1);
    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: "Truvi refused the request with status 400" }]);
  });

  it.each([401, 403, 429])("does not count a %p as a failed attempt, because it is not about this request", async (status) => {
    const { modifier, assessmentRepository } = build({
      verifications: [verification({ failedAttempts: 2 })],
      modify: failWith(status, "Not allowed"),
    });

    const summary = await modifier.run({ now: NOW });

    expect(assessmentRepository.markAttempt).toHaveBeenCalledWith({ bookingId: "booking-1", now: NOW });
    expect(assessmentRepository.saveTruviDates).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ gaveUp: 0 });
    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: `Truvi refused the request with status ${status}` }]);
  });

  it("does not count a timeout or a 5xx as a failed attempt", async () => {
    const { modifier, assessmentRepository } = build({
      verifications: [verification({ failedAttempts: 2 })],
      modify: failWith(503, "Service unavailable"),
    });

    const summary = await modifier.run({ now: NOW });

    expect(assessmentRepository.markAttempt).toHaveBeenCalledWith({ bookingId: "booking-1", now: NOW });
    expect(assessmentRepository.saveTruviDates).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ retryLater: 1, gaveUp: 0 });
  });

  it("keeps going with the next booking when saving one fails", async () => {
    const { modifier, assessmentRepository } = build({
      verifications: [verification(), verification({ bookingId: "booking-2" })],
    });
    assessmentRepository.saveTruviDates.mockRejectedValueOnce(new Error("database down"));

    const summary = await modifier.run({ now: NOW });

    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: "database down" }]);
    expect(summary.modified).toBe(1);
  });

  it("does not touch a booking that was sent or recorded", async () => {
    const { modifier, assessmentRepository } = build();

    await modifier.run({ now: NOW });

    expect(assessmentRepository.markAttempt).not.toHaveBeenCalled();
  });
});

describe("classifyModifyError", () => {
  it.each([
    [new TruviApiError(400, "Reservation is in the past, and can no longer be modified.")],
    [new TruviApiError(400, "checkOut must not be in the past.")],
    [new TruviApiError(400, "checkIn cannot be modified to be in the past.")],
    [new TruviApiError(400, "Verification x already cancelled")],
    [new TruviApiError(404, "Reservation x not found")],
  ])("treats %p as refused", (error) => {
    expect(classifyModifyError(error).refused).toBe(true);
  });

  it("retries a network error without a status", () => {
    expect(classifyModifyError(new TypeError("fetch failed"))).toEqual({ retry: true });
  });
});
