import Database from "database";
import { GuestRiskAssessment } from "database/models/unified/integrations/GuestRiskAssessment";

export const TRUVI_PROVIDER = "truvi";

const assessmentId = (provider, bookingId) => `${provider}:${bookingId}`;

export class GuestRiskAssessmentRepository {
  async getRepository() {
    const client = await Database.getInstance();
    return client.getRepository(GuestRiskAssessment);
  }

  async saveResult({ provider = TRUVI_PROVIDER, bookingId, result, now = Date.now() }) {
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
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await repository.save(row);
    return row;
  }

  async findByBooking({ provider = TRUVI_PROVIDER, bookingId }) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id: assessmentId(provider, bookingId) } });
  }
}