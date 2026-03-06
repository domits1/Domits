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

        // new fields (if present in model/db)
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
    // Dedupe only if platformMessageId exists
    if (data.platformMessageId) {
      const exists = await this.platformMessageExists(data.threadId, data.platformMessageId);
      if (exists) return false;
    }

    await this.createMessage(data);
    return true;
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
