import Database from "database";
import { GuestRiskAssessment } from "database/models/unified/integrations/GuestRiskAssessment";
import { withDsqlRetry } from "../.shared/dsqlRetry.js";
import { randomInt } from "node:crypto";

export const TRUVI_PROVIDER = "truvi";

const assessmentId = (provider, bookingId) => `${provider}:${bookingId}`;

const UNIQUE_VIOLATION = "23505";

const randomJitterMs = () => randomInt(20, 51);

export const withWriteRetry = (work, options = {}) =>
  withDsqlRetry(work, { jitterMs: randomJitterMs, ...options, retryCodes: [UNIQUE_VIOLATION] });

export class GuestRiskAssessmentRepository {
  async getRepository() {
    const client = await Database.getInstance();
    return client.getRepository(GuestRiskAssessment);
  }

  async saveResult(args) {
    return withWriteRetry(() => this.#saveResultOnce(args));
  }

  async #saveResultOnce({ provider = TRUVI_PROVIDER, bookingId, result, arrivalDate, departureDate, now = Date.now() }) {
    if (!bookingId) {
      throw new Error("bookingId is required to save a risk assessment");
    }

    const repository = await this.getRepository();
    const id = assessmentId(provider, bookingId);
    const existing = await repository.findOne({ where: { id } });

    const row = {
      id,
      provider,
      bookingId,
      providerAssessmentId: result.providerAssessmentId ?? null,
      status: result.status,
      flaggedReason: result.flaggedReason ?? null,
      errorMessage: result.error?.message ?? null,
      arrivalDate: arrivalDate ?? existing?.arrivalDate ?? null,
      departureDate: departureDate ?? existing?.departureDate ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await repository.save(row);
    return row;
  }

  async saveCancellation({ provider = TRUVI_PROVIDER, bookingId, status, errorMessage = null, now = Date.now() }) {
    if (!bookingId) {
      throw new Error("bookingId is required to save a cancellation");
    }
    const repository = await this.getRepository();
    await repository.update(
      { id: assessmentId(provider, bookingId) },
      { status, errorMessage, failedAttempts: null, updatedAt: now }
    );
  }

  async saveTruviDates({ provider = TRUVI_PROVIDER, bookingId, arrivalDate, departureDate, errorMessage, now = Date.now() }) {
    if (!bookingId) {
      throw new Error("bookingId is required to save the Truvi dates");
    }
    const changes = { arrivalDate, departureDate, failedAttempts: null, updatedAt: now };
    if (errorMessage !== undefined) {
      changes.errorMessage = errorMessage;
    }
    const repository = await this.getRepository();
    await repository.update({ id: assessmentId(provider, bookingId) }, changes);
  }

  async markAttempt({ provider = TRUVI_PROVIDER, bookingId, failedAttempts, now = Date.now() }) {
    if (!bookingId) {
      throw new Error("bookingId is required to mark a Truvi attempt");
    }
    const changes = failedAttempts === undefined ? { updatedAt: now } : { failedAttempts, updatedAt: now };
    const repository = await this.getRepository();
    await repository.update({ id: assessmentId(provider, bookingId) }, changes);
  }

  async findByBooking({ provider = TRUVI_PROVIDER, bookingId }) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id: assessmentId(provider, bookingId) } });
  }
}
