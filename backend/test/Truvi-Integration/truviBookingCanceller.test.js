import { describe, expect, it, jest } from "@jest/globals";
import {
  CANCEL_STATUS,
  classifyCancelError,
  TruviBookingCanceller,
} from "../../functions/Truvi-Integration/business/truviBookingCanceller.js";
import { TruviApiError } from "../../functions/Truvi-Integration/data/truviApiClient.js";

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);

const build = ({ verifications = [{ bookingId: "booking-1", verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" }], cancel } = {}) => {
  const bookingRepository = { listVerificationsToCancel: jest.fn(async () => verifications) };
  const apiClient = { cancelVerification: jest.fn(cancel || (async () => ({ metadata: {} }))) };
  const assessmentRepository = { saveCancellation: jest.fn(async () => undefined) };
  const canceller = new TruviBookingCanceller({ bookingRepository, apiClient, assessmentRepository });
  return { canceller, bookingRepository, apiClient, assessmentRepository };
};

const failWith = (status, message) => async () => {
  throw new TruviApiError(status, message);
};

describe("TruviBookingCanceller", () => {
  it("cancels the verification at Truvi with the booking id as reservation id and saves CANCELLED", async () => {
    const { canceller, bookingRepository, apiClient, assessmentRepository } = build();

    const summary = await canceller.run({ limit: 5, now: NOW });

    expect(bookingRepository.listVerificationsToCancel).toHaveBeenCalledWith({ limit: 5 });
    const request = apiClient.cancelVerification.mock.calls[0][0];
    expect(request.verification).toEqual({ verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" });
    expect(request.reservation).toEqual({ reservationId: "booking-1" });
    expect(request.metadata.timeStamp).toBe("2026-10-19T10:00:00.00");
    expect(request.metadata.echoToken).toHaveLength(36);
    expect(assessmentRepository.saveCancellation).toHaveBeenCalledWith({
      bookingId: "booking-1",
      status: CANCEL_STATUS.CANCELLED,
      errorMessage: null,
      now: NOW,
    });
    expect(summary).toEqual({ listed: 1, cancelled: 1, refused: 0, retryLater: 0, errors: [] });
  });

  it("treats an already cancelled verification as cancelled", async () => {
    const { canceller, assessmentRepository } = build({
      cancel: failWith(400, "Verification 9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1 already cancelled"),
    });

    const summary = await canceller.run({ now: NOW });

    expect(assessmentRepository.saveCancellation.mock.calls[0][0].status).toBe(CANCEL_STATUS.CANCELLED);
    expect(summary.cancelled).toBe(1);
  });

  it("saves CANCEL_REFUSED with the reason when the check-in has passed, so it is not tried again", async () => {
    const { canceller, assessmentRepository } = build({
      cancel: failWith(400, "checkIn is in the past, and can no longer be cancelled."),
    });

    const summary = await canceller.run({ now: NOW });

    expect(assessmentRepository.saveCancellation).toHaveBeenCalledWith({
      bookingId: "booking-1",
      status: CANCEL_STATUS.REFUSED,
      errorMessage: "checkIn is in the past, and can no longer be cancelled.",
      now: NOW,
    });
    expect(summary.refused).toBe(1);
  });

  it("leaves the booking for the next run on a timeout or a 5xx", async () => {
    const { canceller, assessmentRepository } = build({
      verifications: [
        { bookingId: "booking-1", verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" },
        { bookingId: "booking-2", verificationId: "4a7e2d90-8f51-4c63-b28a-9d6f1750e3c8" },
      ],
      cancel: jest
        .fn()
        .mockRejectedValueOnce(new TruviApiError(null, "Truvi did not answer within 10000 ms"))
        .mockRejectedValueOnce(new TruviApiError(500, "Unexpected error")),
    });

    const summary = await canceller.run({ now: NOW });

    expect(assessmentRepository.saveCancellation).not.toHaveBeenCalled();
    expect(summary).toEqual({ listed: 2, cancelled: 0, refused: 0, retryLater: 2, errors: [] });
  });

  it("reports an unexpected 400 as an error without saving, so the run fails and someone looks", async () => {
    const { canceller, assessmentRepository } = build({ cancel: failWith(400, "verificationId must be a valid GUID.") });

    const summary = await canceller.run({ now: NOW });

    expect(assessmentRepository.saveCancellation).not.toHaveBeenCalled();
    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: "verificationId must be a valid GUID." }]);
  });

  it("keeps going with the next booking when saving one fails", async () => {
    const { canceller, assessmentRepository } = build({
      verifications: [
        { bookingId: "booking-1", verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" },
        { bookingId: "booking-2", verificationId: "4a7e2d90-8f51-4c63-b28a-9d6f1750e3c8" },
      ],
    });
    assessmentRepository.saveCancellation.mockRejectedValueOnce(new Error("database down"));

    const summary = await canceller.run({ now: NOW });

    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: "database down" }]);
    expect(summary.cancelled).toBe(1);
  });
});

describe("classifyCancelError", () => {
  it.each([
    [new TruviApiError(404, "Verification x not found"), CANCEL_STATUS.REFUSED],
    [new TruviApiError(404, "Reservation x not found"), CANCEL_STATUS.REFUSED],
    [new TruviApiError(400, "Verification x is screening only and cannot be cancelled"), CANCEL_STATUS.REFUSED],
    [new TruviApiError(400, "Verification x already cancelled"), CANCEL_STATUS.CANCELLED],
  ])("maps %p to %p", (error, status) => {
    expect(classifyCancelError(error).status).toBe(status);
  });

  it("retries a network error without a status", () => {
    expect(classifyCancelError(new TypeError("fetch failed"))).toEqual({ retry: true });
  });
});
