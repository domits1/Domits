import { sameTruviDates, toModifyRequest } from "../util/truviMapper.js";
import { truviErrorMessage } from "../util/truviErrorMessage.js";
import { MAX_FAILED_ATTEMPTS, nextFailedAttempts } from "../util/truviFailedAttempts.js";

const REFUSED_MESSAGES = [
  "can no longer be modified",
  "must not be in the past",
  "cannot be modified",
  "already cancelled",
  "screening only",
];

const isRetryable = (error) => error?.status === null || error?.status === undefined || error.status >= 500;

export const classifyModifyError = (error) => {
  if (isRetryable(error)) {
    return { retry: true };
  }
  const message = String(error.message ?? "").toLowerCase();
  if (error.status === 404 || (error.status === 400 && REFUSED_MESSAGES.some((text) => message.includes(text)))) {
    return { refused: true, errorMessage: truviErrorMessage(error, REFUSED_MESSAGES) };
  }
  return { unexpected: true };
};

export class TruviBookingModifier {
  constructor({ bookingRepository, apiClient, assessmentRepository }) {
    this.bookingRepository = bookingRepository;
    this.apiClient = apiClient;
    this.assessmentRepository = assessmentRepository;
  }

  async run({ limit, now = Date.now() } = {}) {
    const verifications = await this.bookingRepository.listVerificationsToModify({ now, limit });
    const summary = {
      listed: verifications.length,
      modified: 0,
      recorded: 0,
      refused: 0,
      retryLater: 0,
      gaveUp: 0,
      errors: [],
    };

    for (const verification of verifications) {
      const { bookingId } = verification;
      try {
        const outcome = await this.#handle(verification, now);
        if (outcome.retry) {
          await this.assessmentRepository.markAttempt({ bookingId, now });
          summary.retryLater += 1;
          continue;
        }
        if (outcome.unexpected) {
          await this.#recordFailure(verification, outcome.message, now, summary);
          summary.errors.push({ bookingId, message: outcome.message });
          continue;
        }

        await this.assessmentRepository.saveTruviDates({
          bookingId,
          arrivalDate: verification.current.arrivaldate,
          departureDate: verification.current.departuredate,
          ...(outcome.errorMessage === undefined ? {} : { errorMessage: outcome.errorMessage }),
          now,
        });
        summary[outcome.counter] += 1;
      } catch (error) {
        summary.errors.push({ bookingId, message: error.message });
      }
    }

    return summary;
  }

  async #recordFailure({ bookingId, current, failedAttempts }, message, now, summary) {
    const attempts = nextFailedAttempts(failedAttempts);
    if (attempts < MAX_FAILED_ATTEMPTS) {
      await this.assessmentRepository.markAttempt({ bookingId, failedAttempts: attempts, now });
      return;
    }
    await this.assessmentRepository.saveTruviDates({
      bookingId,
      arrivalDate: current.arrivaldate,
      departureDate: current.departuredate,
      errorMessage: message,
      now,
    });
    summary.gaveUp += 1;
  }

  async #handle({ bookingId, verificationId, sent, current }, now) {
    const neverRecorded = sent.arrivaldate === null || sent.departuredate === null;
    if (neverRecorded || sameTruviDates(sent, current)) {
      return { counter: "recorded" };
    }

    try {
      await this.apiClient.modifyVerification(
        toModifyRequest({
          verificationId,
          reservationId: bookingId,
          arrivaldate: current.arrivaldate,
          departuredate: current.departuredate,
          now: new Date(now),
        })
      );
      return { counter: "modified", errorMessage: null };
    } catch (error) {
      const outcome = classifyModifyError(error);
      if (outcome.refused) {
        return { counter: "refused", errorMessage: outcome.errorMessage };
      }
      return outcome.unexpected ? { unexpected: true, message: truviErrorMessage(error) } : outcome;
    }
  }
}

export default TruviBookingModifier;
