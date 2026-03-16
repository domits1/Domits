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

    if (!threadId) {
      if (payload.platform === "WHATSAPP" && payload.integrationAccountId && payload.externalThreadId) {
        thread = await this.threadRepository.upsertExternalThread({
          integrationAccountId: payload.integrationAccountId,
          platform: payload.platform,
          externalThreadId: payload.externalThreadId,
          hostId: explicitHostId || senderId,
          guestId: explicitGuestId || recipientId,
          propertyId: payload.propertyId ?? null,
          status: "OPEN",
        });
      } else {
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
      }

      threadId = thread.id;
    } else if (payload.platform === "WHATSAPP" && payload.integrationAccountId && payload.externalThreadId) {
      thread = await this.threadRepository.upsertExternalThread({
        integrationAccountId: payload.integrationAccountId,
        platform: payload.platform,
        externalThreadId: payload.externalThreadId,
        hostId: explicitHostId || senderId,
        guestId: explicitGuestId || recipientId,
        propertyId: payload.propertyId ?? null,
        status: "OPEN",
      });
      threadId = thread.id;
    }

    let providerResult = null;
    let platformMessageId = payload.platformMessageId ?? null;
    let deliveryStatus = payload.platform === "DOMITS" ? "delivered" : "pending";
    let errorCode = null;
    let errorMessage = null;

    if (payload.platform === "WHATSAPP") {
      try {
        providerResult = await this.whatsAppProviderAdapter.sendMessage({
          integrationAccountId: payload.integrationAccountId,
          recipientId,
          content: payload.content,
          attachments: payload.attachments,
        });

        platformMessageId = providerResult?.providerMessageId || null;
        deliveryStatus = "sent";
      } catch (error) {
        providerResult = {
          accepted: false,
          mode: "live",
          channel: "WHATSAPP",
          integrationAccountId: payload.integrationAccountId ?? null,
          externalAccountId: null,
          recipientWhatsAppId: recipientId,
          messageType: Array.isArray(payload.attachments) && payload.attachments.length > 0 ? "media" : "text",
          text: payload.content || "",
          error: error?.message || String(error),
          details: error?.details || null,
        };

        deliveryStatus = "failed";
        errorCode = error?.code || "WHATSAPP_SEND_FAILED";
        errorMessage = error?.message || "WhatsApp send failed";
      }
    }

    const message = await this.messageRepository.createMessage({
      threadId,
      senderId,
      recipientId,
      content: payload.content,
      platformMessageId,
      metadata:
        payload.platform === "WHATSAPP"
          ? JSON.stringify({
              ...(typeof payload.metadata === "string" ? { rawMetadata: payload.metadata } : payload.metadata || {}),
              providerResult,
            })
          : payload.metadata,
      attachments: payload.attachments,
      deliveryStatus,
      direction: "OUTBOUND",
      externalCreatedAt: null,
      externalSenderType: payload.platform === "WHATSAPP" ? "HOST" : null,
      complianceStatus: null,
      errorCode,
      errorMessage,
    });

    await this.threadRepository.updateThreadActivity({
      threadId,
      direction: "OUTBOUND",
      eventAt: Date.now(),
    });

    return {
      statusCode: errorCode ? 502 : 201,
      response: {
        ...message,
        threadId,
        providerResult,
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