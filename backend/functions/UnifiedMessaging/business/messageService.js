import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import WhatsAppProviderAdapter from "./whatsappProviderAdapter.js";

class MessageService {
  constructor() {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
    this.whatsAppProviderAdapter = new WhatsAppProviderAdapter();
  }

  async sendMessage(payload) {
    let threadId = payload.threadId || null;

    const senderId = payload.senderId;
    const recipientId = payload.recipientId;

    const explicitHostId = payload.hostId || null;
    const explicitGuestId = payload.guestId || null;

    let thread = null;

    if (threadId) {
      thread = await this.threadRepository.getThreadById(threadId);
      if (!thread) {
        return {
          statusCode: 404,
          response: { error: "Thread not found" },
        };
      }
    }

    if (!threadId) {
      thread = await this.threadRepository.findThread(senderId, recipientId, payload.propertyId);

      if (!thread) {
        const hostId = explicitHostId || senderId;
        const guestId = explicitGuestId || recipientId;

        thread = await this.threadRepository.createThread({
          hostId,
          guestId,
          propertyId: payload.propertyId ?? null,
          platform: payload.platform || "DOMITS",
          externalThreadId: payload.externalThreadId,
          integrationAccountId: payload.integrationAccountId ?? null,
        });
      }

      threadId = thread.id;
    }

    const resolvedPlatform = payload.platform || thread?.platform || "DOMITS";

    let outboundResult = null;

    if (resolvedPlatform === "WHATSAPP") {
      outboundResult = await this.whatsAppProviderAdapter.sendText({
        thread,
        payload: {
          ...payload,
          threadId,
          platform: resolvedPlatform,
        },
      });

      if (!outboundResult?.ok) {
        return {
          statusCode: outboundResult?.statusCode || 400,
          response: outboundResult?.response || { error: "Failed to send WhatsApp message" },
        };
      }
    }

    const message = await this.messageRepository.createMessage({
      threadId,
      senderId,
      recipientId,
      content: payload.content,
      platformMessageId: outboundResult?.platformMessageId ?? payload.platformMessageId ?? null,
      metadata: payload.metadata,
      attachments: payload.attachments,
      deliveryStatus:
        resolvedPlatform === "DOMITS"
          ? "delivered"
          : outboundResult?.deliveryStatus || "pending",
      direction: payload.direction ?? "OUTBOUND",
      externalCreatedAt: outboundResult?.externalCreatedAt ?? null,
      externalSenderType: payload.externalSenderType ?? "HOST",
      complianceStatus: payload.complianceStatus ?? null,
      errorCode: null,
      errorMessage: null,
    });

    await this.threadRepository.updateThreadActivity({
      threadId,
      direction: "OUTBOUND",
      eventAt: Date.now(),
    });

    return {
      statusCode: 201,
      response: {
        ...message,
        threadId,
        providerResult: outboundResult?.response || null,
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