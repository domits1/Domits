import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import { randomUUID } from "crypto";

class MessageService {
  constructor() {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
  }

  async sendMessage(payload) {
    let threadId = payload.threadId;

    if (!threadId) {
      let thread = await this.threadRepository.findThread(payload.senderId, payload.recipientId, payload.propertyId);
      if (!thread) {
        thread = await this.threadRepository.createThread({
          hostId: payload.senderId,
          guestId: payload.recipientId,
          propertyId: payload.propertyId,
          platform: payload.platform || "DOMITS",
          externalThreadId: payload.externalThreadId,
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
      deliveryStatus: payload.platform === "DOMITS" ? "delivered" : "pending",
    });

    await this.threadRepository.updateLastMessageAt(threadId, Date.now());

    return {
      statusCode: 201,
      response: message,
    };
  }

  async getThreads(userId) {
    const threads = await this.threadRepository.getThreadsForUser(userId);
    return {
      statusCode: 200,
      response: threads,
    };
  }

  async getMessages(threadId) {
    const messages = await this.messageRepository.getMessagesByThreadId(threadId);
    return {
      statusCode: 200,
      response: messages,
    };
  }

  async getMessagesByUsers(userId, recipientId, propertyId) {
    const thread = await this.threadRepository.findThread(userId, recipientId, propertyId);
    if (!thread) {
      return {
        statusCode: 200,
        response: [],
      };
    }
    const messages = await this.messageRepository.getMessagesByThreadId(thread.id);
    return {
      statusCode: 200,
      response: messages,
    };
  }
}

export default MessageService;
