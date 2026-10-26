import Database from "database";
import { GuestRiskAssessment } from "database/models/unified/integrations/GuestRiskAssessment";
import { isDsqlConflict } from "../.shared/dsqlRetry.js";
import { randomInt } from "node:crypto";

export const TRUVI_PROVIDER = "truvi";

const assessmentId = (provider, bookingId) => `${provider}:${bookingId}`;

const UNIQUE_VIOLATION = "23505";
const SAVE_ATTEMPTS = 3;

const errorCode = (error) => String(error?.code || error?.driverError?.code || "");
const isRetryableWrite = (error) => isDsqlConflict(error) || errorCode(error) === UNIQUE_VIOLATION;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomJitterMs = () => randomInt(20, 51);

export const withWriteRetry = async (
  work,
  { attempts = SAVE_ATTEMPTS, wait = sleep, jitterMs = randomJitterMs } = {},
  attempt = 1
) => {
  try {
    return await work();
  } catch (error) {
    if (!isRetryableWrite(error) || attempt >= attempts) throw error;
    await wait(jitterMs());
    return withWriteRetry(work, { attempts, wait, jitterMs }, attempt + 1);
  }
};

export class GuestRiskAssessmentRepository {
  async getRepository() {
    const client = await Database.getInstance();
    return client.getRepository(GuestRiskAssessment);
  }

  async saveResult(args) {
    return withWriteRetry(() => this.#saveResultOnce(args));
  }

  async #saveResultOnce({ provider = TRUVI_PROVIDER, bookingId, result, now = Date.now() }) {
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