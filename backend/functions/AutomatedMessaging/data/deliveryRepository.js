import { randomUUID } from "node:crypto";
import Database from "../.shared/integrations/ORM/index.js";
import { MessageAutomationDelivery } from "database/models/automation/MessageAutomationDelivery";

const resolveSafeSchema = (client) => {
  const schema = client?.options?.schema || "main";
  return /^[a-z_][a-z0-9_]*$/i.test(schema) ? schema : "main";
};

export default class DeliveryRepository {
  async createScheduled(data) {
    const client = await Database.getInstance();
    const now = Date.now();
    const delivery = {
      id: randomUUID(),
      ...data,
      status: "SCHEDULED",
      messageId: null,
      failureReason: null,
      renderedContent: null,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    };

    await client.createQueryBuilder().insert().into(MessageAutomationDelivery).values(delivery).orIgnore().execute();
    return this.getByIdempotencyKey(data.idempotencyKey);
  }

  async getByIdempotencyKey(idempotencyKey) {
    const client = await Database.getInstance();
    return client.getRepository(MessageAutomationDelivery).findOne({ where: { idempotencyKey } });
  }

  async listByAutomation(automationId) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessageAutomationDelivery)
      .createQueryBuilder("delivery")
      .where("delivery.automationId = :automationId", { automationId })
      .orderBy("delivery.createdAt", "DESC")
      .getMany();
  }

  async listDue(now, limit = 50, processingStaleMs = 5 * 60 * 1000) {
    const client = await Database.getInstance();
    return client
      .getRepository(MessageAutomationDelivery)
      .createQueryBuilder("delivery")
      .where("delivery.scheduledFor <= :now", { now })
      .andWhere(
        "(delivery.status = :scheduled OR (delivery.status = :processing AND delivery.updatedAt <= :staleBefore))",
        { scheduled: "SCHEDULED", processing: "PROCESSING", staleBefore: now - processingStaleMs }
      )
      .orderBy("delivery.scheduledFor", "ASC")
      .limit(limit)
      .getMany();
  }

  async claim(id, now, processingStaleMs = 5 * 60 * 1000) {
    const client = await Database.getInstance();
    const result = await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({ status: "PROCESSING", failureReason: null, updatedAt: now })
      .where("id = :id", { id })
      .andWhere("scheduledFor <= :now", { now })
      .andWhere("(status = :scheduled OR (status = :processing AND updatedAt <= :staleBefore))", {
        scheduled: "SCHEDULED",
        processing: "PROCESSING",
        staleBefore: now - processingStaleMs,
      })
      .execute();
    return Number(result?.affected || 0) === 1;
  }

  async authorizeSend({ deliveryId, automationId, bookingId, hostId, propertyId, now }) {
    const client = await Database.getInstance();
    const schema = resolveSafeSchema(client);
    const result = await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({ updatedAt: now })
      .where("id = :deliveryId", { deliveryId })
      .andWhere("automationid = :automationId", { automationId })
      .andWhere("bookingid = :bookingId", { bookingId })
      .andWhere("status = :processing", { processing: "PROCESSING" })
      .andWhere(
        `EXISTS (
          SELECT 1
            FROM ${schema}.message_automation automation
            JOIN ${schema}.booking booking ON booking.id = :bookingId
            JOIN ${schema}.property property ON property.id = :propertyId
           WHERE automation.id = :automationId
             AND automation.hostid = :hostId
             AND automation.status = 'ACTIVE'
             AND (automation.propertyid IS NULL OR automation.propertyid = :propertyId)
             AND booking.hostid = :hostId
             AND booking.property_id = :propertyId
             AND LOWER(TRIM(booking.status)) = 'paid'
             AND property.hostid = :hostId
        )`,
        { automationId, bookingId, hostId, propertyId }
      )
      .execute();
    return Number(result?.affected || 0) === 1;
  }

  async updateStatus(id, patch) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({ ...patch, updatedAt: Date.now() })
      .where("id = :id", { id })
      .execute();
  }

  async markSent(id, { messageId, renderedContent, sentAt, diagnostic = null }) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({
        status: "SENT",
        messageId,
        renderedContent,
        sentAt,
        failureReason: diagnostic,
        updatedAt: Date.now(),
      })
      .where("id = :id", { id })
      .andWhere("status IN (:...statuses)", { statuses: ["PROCESSING", "FAILED"] })
      .execute();
  }

  async markFailed(id, failureReason) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({ status: "FAILED", failureReason, updatedAt: Date.now() })
      .where("id = :id", { id })
      .andWhere("status = :processing", { processing: "PROCESSING" })
      .execute();
  }

  async markCancelled(id, failureReason) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(MessageAutomationDelivery)
      .set({ status: "CANCELLED", failureReason, updatedAt: Date.now() })
      .where("id = :id", { id })
      .andWhere("status = :processing", { processing: "PROCESSING" })
      .execute();
  }
}
