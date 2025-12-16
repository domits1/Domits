import Database from "database";
import { UnifiedMessage } from "database/models/UnifiedMessage";
import { randomUUID } from "crypto";

class MessageRepository {
    async createMessage(data) {
        const client = await Database.getInstance();
        const id = randomUUID();
        const createdAt = Date.now();

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
                metadata: data.metadata
            })
            .execute();

        return {
            id,
            ...data,
            createdAt
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

