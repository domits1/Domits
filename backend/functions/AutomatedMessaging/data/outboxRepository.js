import Database from "../.shared/integrations/ORM/index.js";
import { BookingAutomationOutbox } from "database/models/automation/BookingAutomationOutbox";

export default class OutboxRepository {
  async listProcessable(limit = 50, maxAttempts = 3, now = Date.now(), processingStaleMs = 5 * 60 * 1000) {
    const client = await Database.getInstance();
    return client
      .getRepository(BookingAutomationOutbox)
      .createQueryBuilder("event")
      .where(
        "(event.status IN (:...statuses) OR (event.status = :processing AND event.updatedAt <= :staleBefore))",
        {
          statuses: ["PENDING", "FAILED"],
          processing: "PROCESSING",
          staleBefore: now - processingStaleMs,
        }
      )
      .andWhere("event.attemptCount < :maxAttempts", { maxAttempts })
      .orderBy("event.occurredAt", "ASC")
      .limit(limit)
      .getMany();
  }

  async claim(id, now = Date.now(), processingStaleMs = 5 * 60 * 1000) {
    const client = await Database.getInstance();
    const result = await client
      .createQueryBuilder()
      .update(BookingAutomationOutbox)
      .set({ status: "PROCESSING", attemptCount: () => "attemptcount + 1", updatedAt: now })
      .where("id = :id", { id })
      .andWhere("(status IN (:...statuses) OR (status = :processing AND updatedat <= :staleBefore))", {
        statuses: ["PENDING", "FAILED"],
        processing: "PROCESSING",
        staleBefore: now - processingStaleMs,
      })
      .execute();
    return Number(result?.affected || 0) === 1;
  }

  async markProcessed(id) {
    const now = Date.now();
    await this.update(id, { status: "PROCESSED", processedAt: now, failureReason: null, updatedAt: now });
  }

  async markFailed(id, failureReason) {
    await this.update(id, { status: "FAILED", failureReason, updatedAt: Date.now() });
  }

  async update(id, patch) {
    const client = await Database.getInstance();
    await client.createQueryBuilder().update(BookingAutomationOutbox).set(patch).where("id = :id", { id }).execute();
  }
}
