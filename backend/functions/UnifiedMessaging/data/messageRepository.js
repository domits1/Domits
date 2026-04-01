import Database from "../ORM/index.js";
import { UnifiedMessage } from "../models/unified/messaging/UnifiedMessage.js";
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
      if (exists) return null;
    }

    return this.createMessage(data);
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
