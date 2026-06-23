import Database from "../.shared/integrations/ORM/index.js";
import { UnifiedMessage } from "database/models/unified/messaging/UnifiedMessage";
import { randomUUID } from "node:crypto";

class MessageRepository {
  async createMessage(data) {
    const client = await Database.getInstance();
    const id = randomUUID();
    const createdAt = data.createdAt ?? Date.now();

    await client
      .createQueryBuilder()
      .insert()
      .into(UnifiedMessage)
      .values({
        id,
        threadId: data.threadId,
        senderId: data.senderId,
        recipientId: data.recipientId,
        content: data.content,
        platformMessageId: data.platformMessageId ?? null,
        automationDeliveryId: data.automationDeliveryId ?? null,
        createdAt,
        isRead: data.isRead ?? false,
        metadata: data.metadata ?? null,
        attachments: data.attachments ?? null,
        deliveryStatus: data.deliveryStatus || "pending",
        direction: data.direction ?? null,
        externalCreatedAt: data.externalCreatedAt ?? null,
        externalSenderType: data.externalSenderType ?? null,
        complianceStatus: data.complianceStatus ?? null,
        errorCode: data.errorCode ?? null,
        errorMessage: data.errorMessage ?? null,
      })
      .execute();

    return {
      id,
      ...data,
      createdAt,
    };
  }

  async platformMessageExists(threadId, platformMessageId) {
    if (!platformMessageId) return false;
    const client = await Database.getInstance();

    const count = await client
      .getRepository(UnifiedMessage)
      .createQueryBuilder("m")
      .where("m.threadId = :threadId", { threadId })
      .andWhere("m.platformMessageId = :platformMessageId", { platformMessageId })
      .getCount();

    return count > 0;
  }

  async createMessageIfNotExists(data) {
    if (data.platformMessageId) {
      const exists = await this.platformMessageExists(data.threadId, data.platformMessageId);
      if (exists) return false;
    }

    await this.createMessage(data);
    return true;
  }

  async findByPlatformMessageId(platformMessageId) {
    if (!platformMessageId) return null;

    const client = await Database.getInstance();
    return client
      .getRepository(UnifiedMessage)
      .createQueryBuilder("m")
      .where("m.platformMessageId = :platformMessageId", { platformMessageId })
      .orderBy("m.createdAt", "DESC")
      .getOne();
  }

  async findByAutomationDeliveryId(automationDeliveryId) {
    if (!automationDeliveryId) return null;
    const client = await Database.getInstance();
    return client.getRepository(UnifiedMessage).findOne({ where: { automationDeliveryId } });
  }

  async createAutomatedMessageIfEligible(data) {
    const client = await Database.getInstance();
    const id = randomUUID();
    const schema = client?.options?.schema || "main";
    const safeSchema = /^[a-z_][a-z0-9_]*$/i.test(schema) ? schema : "main";
    const rows = await client.query(
      `INSERT INTO ${safeSchema}.unified_message (
         "id", "threadId", "senderId", "recipientId", "content", automationdeliveryid,
         "createdAt", "isRead", "metadata", "attachments", "deliveryStatus", direction
       )
       SELECT $1, $2, $3, $4, $5, $6, $7, FALSE, $8, NULL, $9, $10
         FROM ${safeSchema}.message_automation_delivery delivery
         JOIN ${safeSchema}.message_automation automation ON automation.id = delivery.automationid
         JOIN ${safeSchema}.booking booking ON booking.id = delivery.bookingid
         JOIN ${safeSchema}.property property ON property.id = booking.property_id
        WHERE delivery.id = $6
          AND delivery.status = 'PROCESSING'
          AND automation.id = $11
          AND automation.hostid = $3
          AND automation.status = 'ACTIVE'
          AND (automation.propertyid IS NULL OR automation.propertyid = $12)
          AND booking.id = $13
          AND booking.hostid = $3
          AND booking.guestid = $4
          AND booking.property_id = $12
          AND LOWER(TRIM(booking.status)) = 'paid'
          AND property.hostid = $3
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        id,
        data.threadId,
        data.senderId,
        data.recipientId,
        data.content,
        data.automationDeliveryId,
        data.createdAt,
        data.metadata ?? null,
        data.deliveryStatus ?? "delivered",
        data.direction ?? "OUTBOUND",
        data.automationId,
        data.propertyId,
        data.bookingId,
      ]
    );
    const message = await this.findByAutomationDeliveryId(data.automationDeliveryId);
    return { message, created: Array.isArray(rows) && rows.length === 1 };
  }

  async updateMessageStatusByPlatformMessageId(platformMessageId, patch = {}) {
    if (!platformMessageId) return null;

    const client = await Database.getInstance();
    const existing = await this.findByPlatformMessageId(platformMessageId);
    if (!existing) return null;

    let nextMetadata = existing.metadata ?? null;

    if (patch.metadataPatch) {
      let parsed = {};
      if (typeof nextMetadata === "string") {
        try {
          parsed = JSON.parse(nextMetadata) || {};
        } catch {
          parsed = { rawMetadata: nextMetadata };
        }
      } else if (nextMetadata && typeof nextMetadata === "object") {
        parsed = nextMetadata;
      }

      nextMetadata = JSON.stringify({
        ...parsed,
        ...patch.metadataPatch,
      });
    }

    const next = {
      ...existing,
      deliveryStatus: patch.deliveryStatus ?? existing.deliveryStatus,
      errorCode: patch.errorCode ?? existing.errorCode,
      errorMessage: patch.errorMessage ?? existing.errorMessage,
      metadata: nextMetadata,
    };

    await client
      .createQueryBuilder()
      .update(UnifiedMessage)
      .set({
        deliveryStatus: next.deliveryStatus,
        errorCode: next.errorCode,
        errorMessage: next.errorMessage,
        metadata: next.metadata,
      })
      .where("id = :id", { id: existing.id })
      .execute();

    return next;
  }

  async getMessagesByThreadId(threadId) {
    const client = await Database.getInstance();
    const messages = await client
      .getRepository(UnifiedMessage)
      .createQueryBuilder("message")
      .where("message.threadId = :threadId", { threadId })
      .orderBy("message.createdAt", "ASC")
      .getMany();

    return messages;
  }
}

export default MessageRepository;
