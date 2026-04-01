import ThreadRepository from "../data/threadRepository.js";
import MessageRepository from "../data/messageRepository.js";
import MessagingRuntimeService from "./messagingRuntimeService.js";

const nowMs = () => Date.now();

const toNullableJsonString = (value) => {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const badRequest = (error) => ({ statusCode: 400, response: { error } });

const validateIngestionPayload = (payload) => {
  if (!payload?.integrationAccountId) return "Missing integrationAccountId";
  if (!payload?.platform) return "Missing platform";
  if (!payload?.externalThreadId) return "Missing externalThreadId";
  if (!payload?.hostId || !payload?.guestId) return "Missing hostId/guestId";
  return null;
};

const normalizeExternalCreatedAt = (value) => {
  if (value == null) return null;
  if (typeof value === "number") return value;

  const parsed = Number(new Date(value).getTime());
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveDeliveryStatus = (direction) => (direction === "OUTBOUND" ? "pending" : "delivered");

export default class IngestionService {
  constructor() {
    this.threadRepo = new ThreadRepository();
    this.messageRepo = new MessageRepository();
    this.messagingRuntimeService = new MessagingRuntimeService();
  }

  /**
   * Ingest external messages into unified tables.
   *
   * Expected payload:
   * {
   *  integrationAccountId: string,
   *  platform: string, // e.g. "BOOKING_COM"
   *  externalThreadId: string,
   *  hostId: string,
   *  guestId: string,
   *  propertyId?: string|null,
   *  messages: [{
   *    platformMessageId?: string|null,
   *    senderId: string,
   *    recipientId: string,
   *    content: string,
   *    externalCreatedAt?: number|string|null,
   *    direction?: "INBOUND"|"OUTBOUND"|"SYSTEM",
   *    externalSenderType?: string|null,
   *    metadata?: any,
   *    attachments?: any,
   *  }]
   * }
   */
  async ingestExternalThread(payload) {
    const validationError = validateIngestionPayload(payload);
    if (validationError) {
      return badRequest(validationError);
    }

    // 1) upsert thread by (platform + integrationAccountId + externalThreadId)
    const thread = await this.threadRepo.upsertExternalThread({
      integrationAccountId: payload.integrationAccountId,
      platform: payload.platform,
      externalThreadId: payload.externalThreadId,
      hostId: payload.hostId,
      guestId: payload.guestId,
      propertyId: payload?.propertyId ?? null,
      status: payload?.status ?? "OPEN",
    });

    // 2) insert messages with dedupe (platformMessageId preferred)
    const incoming = Array.isArray(payload?.messages) ? payload.messages : [];
    let inserted = 0;
    let lastSuccessfulItemAt = null;

    for (const m of incoming) {
      if (!m) continue;

      const platformMessageId = m.platformMessageId ?? null;
      const externalCreatedAt = normalizeExternalCreatedAt(m.externalCreatedAt);
      const direction = m.direction || "INBOUND";

      const createdMessage = await this.messageRepo.createMessageIfNotExists({
        threadId: thread.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content ?? "",
        platformMessageId,
        createdAt: nowMs(), // internal created time
        isRead: false,
        deliveryStatus: resolveDeliveryStatus(direction),
        direction,
        externalCreatedAt: Number.isFinite(externalCreatedAt) ? externalCreatedAt : null,
        externalSenderType: m.externalSenderType ?? null,
        complianceStatus: m.complianceStatus ?? null,
        errorCode: m.errorCode ?? null,
        errorMessage: m.errorMessage ?? null,
        metadata: toNullableJsonString(m.metadata),
        attachments: toNullableJsonString(m.attachments),
      });

      if (createdMessage) {
        inserted += 1;
        if (Number.isFinite(externalCreatedAt)) {
          lastSuccessfulItemAt = Math.max(lastSuccessfulItemAt ?? 0, externalCreatedAt);
        }

        const isInboundGuestMessage =
          direction === "INBOUND" &&
          (String(m.externalSenderType || "").toUpperCase() === "GUEST" || String(m.senderId) === String(payload.guestId));

        if (isInboundGuestMessage) {
          try {
            await this.messagingRuntimeService.processInboundGuestMessage({
              hostId: payload.hostId,
              guestId: payload.guestId,
              threadId: thread.id,
              propertyId: payload?.propertyId ?? null,
              platform: payload.platform,
              content: m.content ?? "",
              messageId: createdMessage.id,
              integrationAccountId: payload.integrationAccountId,
              externalThreadId: payload.externalThreadId,
              metadata: m.metadata || {},
            });
          } catch (runtimeError) {
            console.error("Messaging runtime side effects failed for ingested inbound message:", runtimeError);
          }
        }
      }

      // update thread activity timestamps
      await this.threadRepo.updateThreadActivity({
        threadId: thread.id,
        direction,
        eventAt: Number.isFinite(externalCreatedAt) ? externalCreatedAt : nowMs(),
      });
    }

    return {
      statusCode: 200,
      response: {
        ok: true,
        threadId: thread.id,
        insertedMessages: inserted,
        lastSuccessfulItemAt,
      },
    };
  }
}
