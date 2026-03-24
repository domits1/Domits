import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";

class MessageService {
  constructor() {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
  }

  async sendMessage(payload) {
    let threadId = payload.threadId || null;

    const senderId = payload.senderId;
    const recipientId = payload.recipientId;

    const explicitHostId = payload.hostId || null;
    const explicitGuestId = payload.guestId || null;

    if (!threadId) {
      let thread = await this.threadRepository.findThread(senderId, recipientId, payload.propertyId);

      if (!thread) {
        const hostId = explicitHostId || senderId;
        const guestId = explicitGuestId || recipientId;

        thread = await this.threadRepository.createThread({
          hostId,
          guestId,
          propertyId: payload.propertyId ?? null,
          platform: payload.platform || "DOMITS",
          externalThreadId: payload.externalThreadId,
        });
      }

      threadId = thread.id;
    }

    const message = await this.messageRepository.createMessage({
      threadId: threadId,
      senderId: senderId,
      recipientId: recipientId,
      content: payload.content,
      platformMessageId: payload.platformMessageId,
      metadata: payload.metadata,
      attachments: payload.attachments,
      deliveryStatus: payload.platform === "DOMITS" ? "delivered" : "pending",
    });

    await this.threadRepository.updateLastMessageAt(threadId, Date.now());

    return {
      statusCode: 201,
      response: {
        ...message,
        threadId,
      },
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
