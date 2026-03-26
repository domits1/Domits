import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import WhatsAppProviderAdapter from "./whatsappProviderAdapter.js";

const isWhatsAppPayload = (payload) => payload.platform === "WHATSAPP";
const resolveParticipantId = (explicitId, fallbackId) => explicitId || fallbackId;

const buildExternalThreadPayload = (payload, senderId, recipientId) => ({
  integrationAccountId: payload.integrationAccountId,
  platform: payload.platform,
  externalThreadId: payload.externalThreadId,
  hostId: resolveParticipantId(payload.hostId || null, senderId),
  guestId: resolveParticipantId(payload.guestId || null, recipientId),
  propertyId: payload.propertyId ?? null,
  status: "OPEN",
});

const buildThreadPayload = (payload, senderId, recipientId) => ({
  hostId: resolveParticipantId(payload.hostId || null, senderId),
  guestId: resolveParticipantId(payload.guestId || null, recipientId),
  propertyId: payload.propertyId ?? null,
  platform: payload.platform || "DOMITS",
  externalThreadId: payload.externalThreadId,
  integrationAccountId: payload.integrationAccountId ?? null,
});

const buildWhatsAppFailureResult = (payload, recipientId, error) => ({
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
});

const buildStoredMetadata = (payload, providerResult) => {
  if (!isWhatsAppPayload(payload)) {
    return payload.metadata;
  }

  const baseMetadata =
    typeof payload.metadata === "string" ? { rawMetadata: payload.metadata } : payload.metadata || {};

  return JSON.stringify({
    ...baseMetadata,
    providerResult,
  });
};

class MessageService {
  constructor() {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
    this.whatsAppProviderAdapter = new WhatsAppProviderAdapter();
  }

  async resolveThread(payload, senderId, recipientId) {
    let threadId = payload.threadId || null;
    let thread = null;
    const shouldUpsertExternalThread =
      isWhatsAppPayload(payload) && payload.integrationAccountId && payload.externalThreadId;

    if (!threadId) {
      if (shouldUpsertExternalThread) {
        thread = await this.threadRepository.upsertExternalThread(buildExternalThreadPayload(payload, senderId, recipientId));
      } else {
        thread = await this.threadRepository.findThread(senderId, recipientId, payload.propertyId);
        if (!thread) {
          thread = await this.threadRepository.createThread(buildThreadPayload(payload, senderId, recipientId));
        }
      }

      return { thread, threadId: thread.id };
    }

    if (shouldUpsertExternalThread) {
      thread = await this.threadRepository.upsertExternalThread(buildExternalThreadPayload(payload, senderId, recipientId));
      threadId = thread.id;
    }

    return { thread, threadId };
  }

  async sendWhatsAppMessage(payload, recipientId) {
    try {
      const providerResult = await this.whatsAppProviderAdapter.sendMessage({
        integrationAccountId: payload.integrationAccountId,
        recipientId,
        content: payload.content,
        attachments: payload.attachments,
      });

      return {
        providerResult,
        platformMessageId: providerResult?.providerMessageId || null,
        deliveryStatus: "sent",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        providerResult: buildWhatsAppFailureResult(payload, recipientId, error),
        platformMessageId: payload.platformMessageId ?? null,
        deliveryStatus: "failed",
        errorCode: error?.code || "WHATSAPP_SEND_FAILED",
        errorMessage: error?.message || "WhatsApp send failed",
      };
    }
  }

  async sendMessage(payload) {
    const senderId = payload.senderId;
    const recipientId = payload.recipientId;
    const { threadId } = await this.resolveThread(payload, senderId, recipientId);

    let providerResult = null;
    let platformMessageId = payload.platformMessageId ?? null;
    let deliveryStatus = isWhatsAppPayload(payload) ? "pending" : "delivered";
    let errorCode = null;
    let errorMessage = null;

    if (isWhatsAppPayload(payload)) {
      const sendResult = await this.sendWhatsAppMessage(payload, recipientId);
      providerResult = sendResult.providerResult;
      platformMessageId = sendResult.platformMessageId;
      deliveryStatus = sendResult.deliveryStatus;
      errorCode = sendResult.errorCode;
      errorMessage = sendResult.errorMessage;
    }

    const message = await this.messageRepository.createMessage({
      threadId,
      senderId,
      recipientId,
      content: payload.content,
      platformMessageId,
      metadata: buildStoredMetadata(payload, providerResult),
      attachments: payload.attachments,
      deliveryStatus,
      direction: "OUTBOUND",
      externalCreatedAt: null,
      externalSenderType: isWhatsAppPayload(payload) ? "HOST" : null,
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
