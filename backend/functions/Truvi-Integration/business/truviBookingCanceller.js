import { toCancelRequest } from "../util/truviMapper.js";

export const CANCEL_STATUS = {
  CANCELLED: "CANCELLED",
  REFUSED: "CANCEL_REFUSED",
};

const includes = (error, text) => String(error?.message ?? "").toLowerCase().includes(text);

const isRetryable = (error) => error?.status === null || error?.status === undefined || error.status >= 500;

export const classifyCancelError = (error) => {
  if (isRetryable(error)) {
    return { retry: true };
  }
  if (error.status === 400 && includes(error, "already cancelled")) {
    return { status: CANCEL_STATUS.CANCELLED };
  }
  if (error.status === 404 || (error.status === 400 && (includes(error, "can no longer be cancelled") || includes(error, "screening only")))) {
    return { status: CANCEL_STATUS.REFUSED, errorMessage: String(error.message).slice(0, 200) };
  }
  return { unexpected: true };
};

export class TruviBookingCanceller {
  constructor({ bookingRepository, apiClient, assessmentRepository }) {
    this.bookingRepository = bookingRepository;
    this.apiClient = apiClient;
    this.assessmentRepository = assessmentRepository;
  }

  async run({ limit, now = Date.now() } = {}) {
    const verifications = await this.bookingRepository.listVerificationsToCancel({ limit });
    const summary = { listed: verifications.length, cancelled: 0, refused: 0, retryLater: 0, errors: [] };

    for (const { bookingId, verificationId } of verifications) {
      try {
        const outcome = await this.#cancel({ bookingId, verificationId, now });
        if (outcome.retry) {
          summary.retryLater += 1;
          continue;
        }
        if (outcome.unexpected) {
          summary.errors.push({ bookingId, message: outcome.message });
          continue;
        }

        await this.assessmentRepository.saveCancellation({
          bookingId,
          status: outcome.status,
          errorMessage: outcome.errorMessage ?? null,
          now,
        });
        if (outcome.status === CANCEL_STATUS.CANCELLED) {
          summary.cancelled += 1;
        } else {
          summary.refused += 1;
        }
      } catch (error) {
        summary.errors.push({ bookingId, message: error.message });
      }
    }

    return summary;
  }

  async #cancel({ bookingId, verificationId, now }) {
    try {
      await this.apiClient.cancelVerification(
        toCancelRequest({ verificationId, reservationId: bookingId, now: new Date(now) })
      );
      return { status: CANCEL_STATUS.CANCELLED };
    } catch (error) {
      const outcome = classifyCancelError(error);
      return outcome.unexpected ? { unexpected: true, message: String(error.message).slice(0, 200) } : outcome;
    }
  }
}

export default TruviBookingCanceller;
