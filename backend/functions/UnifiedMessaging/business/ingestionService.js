import ThreadRepository from "../data/threadRepository.js";
import MessageRepository from "../data/messageRepository.js";

const nowMs = () => Date.now();

const toNullableJsonString = (value) => {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export default class IngestionService {
  constructor() {
    this.threadRepo = new ThreadRepository();
    this.messageRepo = new MessageRepository();
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
    const integrationAccountId = payload?.integrationAccountId || null;
    const platform = payload?.platform || null;
    const externalThreadId = payload?.externalThreadId || null;

    if (!integrationAccountId) {
      return { statusCode: 400, response: { error: "Missing integrationAccountId" } };
    }
    if (!platform) {
      return { statusCode: 400, response: { error: "Missing platform" } };
    }
    if (!externalThreadId) {
      return { statusCode: 400, response: { error: "Missing externalThreadId" } };
    }

    const hostId = payload?.hostId || null;
    const guestId = payload?.guestId || null;

    if (!hostId || !guestId) {
      return { statusCode: 400, response: { error: "Missing hostId/guestId" } };
    }

    // 1) upsert thread by (platform + integrationAccountId + externalThreadId)
    const thread = await this.threadRepo.upsertExternalThread({
      integrationAccountId,
      platform,
      externalThreadId,
      hostId,
      guestId,
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

      const externalCreatedAt =
        m.externalCreatedAt != null
          ? typeof m.externalCreatedAt === "number"
            ? m.externalCreatedAt
            : Number(new Date(m.externalCreatedAt).getTime())
          : null;

      const direction = m.direction || "INBOUND";

      const didInsert = await this.messageRepo.createMessageIfNotExists({
        threadId: thread.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content ?? "",
        platformMessageId,
        createdAt: nowMs(), // internal created time
        isRead: false,
        deliveryStatus: direction === "OUTBOUND" ? "pending" : "delivered",
        direction,
        externalCreatedAt: Number.isFinite(externalCreatedAt) ? externalCreatedAt : null,
        externalSenderType: m.externalSenderType ?? null,
        complianceStatus: m.complianceStatus ?? null,
        errorCode: m.errorCode ?? null,
        errorMessage: m.errorMessage ?? null,
        metadata: toNullableJsonString(m.metadata),
        attachments: toNullableJsonString(m.attachments),
      });

      if (didInsert) {
        inserted += 1;
        if (Number.isFinite(externalCreatedAt)) {
          lastSuccessfulItemAt = Math.max(lastSuccessfulItemAt ?? 0, externalCreatedAt);
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