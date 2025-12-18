import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import { randomUUID } from "crypto";

class MessageService {
    constructor() {
        this.messageRepository = new MessageRepository();
        this.threadRepository = new ThreadRepository();
    }

    async sendMessage(payload) {
        // payload: { senderId, recipientId, content, propertyId, platform, externalThreadId, attachments, metadata }
        
        let threadId = payload.threadId;

        // If no threadId, try to find existing thread or create new one
        if (!threadId) {
            let thread = await this.threadRepository.findThread(payload.senderId, payload.recipientId, payload.propertyId);
            if (!thread) {
                thread = await this.threadRepository.createThread({
                    hostId: payload.senderId, // Assuming sender is host, logic needs refinement for guest
                    guestId: payload.recipientId,
                    propertyId: payload.propertyId,
                    platform: payload.platform || 'DOMITS',
                    externalThreadId: payload.externalThreadId
                });
            }
            threadId = thread.id;
        }

        const message = await this.messageRepository.createMessage({
            threadId: threadId,
            senderId: payload.senderId,
            recipientId: payload.recipientId,
            content: payload.content,
            platformMessageId: payload.platformMessageId,
            metadata: payload.metadata,
            attachments: payload.attachments,
            deliveryStatus: payload.platform === 'DOMITS' ? 'delivered' : 'pending' // Pending for external platforms until confirmed
        });

        // Update thread's lastMessageAt
        await this.threadRepository.updateLastMessageAt(threadId, Date.now());

        return {
            statusCode: 201,
            response: message
        };
    }

    async getThreads(userId) {
        const threads = await this.threadRepository.getThreadsForUser(userId);
        return {
            statusCode: 200,
            response: threads
        };
    }

    async getMessages(threadId) {
        const messages = await this.messageRepository.getMessagesByThreadId(threadId);
        return {
            statusCode: 200,
            response: messages
        };
    }
}

export default MessageService;
