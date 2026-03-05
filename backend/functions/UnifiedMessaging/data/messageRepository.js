import Database from "database";
import { UnifiedMessage } from "../../../ORM/models/unified/messaging/UnifiedMessage.js";
import { randomUUID } from "node:crypto";

class MessageRepository {
  async createMessage(data) {
    const client = await Database.getInstance();
    const id = randomUUID();
    const createdAt = Date.now();

    const toNullableJsonString = (value) => {
      if (value == null) return null;
      if (typeof value === "string") return value;
      return JSON.stringify(value);
    };

    const metadataValue = toNullableJsonString(data.metadata);
    const attachmentsValue = toNullableJsonString(data.attachments);

    await client
      .createQueryBuilder()
      .insert()
      .into(UnifiedMessage)
      .values({
        id: id,
        threadId: data.threadId,
        senderId: data.senderId,
        recipientId: data.recipientId,
        content: data.content,
        platformMessageId: data.platformMessageId,
        createdAt: createdAt,
        isRead: false,
        metadata: metadataValue,
        attachments: attachmentsValue,
        deliveryStatus: data.deliveryStatus || "pending",
      })
      .execute();

    return {
      id,
      ...data,
      createdAt,
    };
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
