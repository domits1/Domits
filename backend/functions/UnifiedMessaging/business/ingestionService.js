import ThreadRepository from "../data/threadRepository.js";
import MessageRepository from "../data/messageRepository.js";

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
  }

  async ingestExternalThread(payload) {
    const validationError = validateIngestionPayload(payload);
    if (validationError) {
      return badRequest(validationError);
    }

    const thread = await this.threadRepo.upsertExternalThread({
      integrationAccountId: payload.integrationAccountId,
      platform: payload.platform,
      externalThreadId: payload.externalThreadId,
      hostId: payload.hostId,
      guestId: payload.guestId,
      propertyId: payload?.propertyId ?? null,
      status: payload?.status ?? "OPEN",
    });

    const incoming = Array.isArray(payload?.messages) ? payload.messages : [];
    let inserted = 0;
    let lastSuccessfulItemAt = null;

    for (const m of incoming) {
      if (!m) continue;

      const platformMessageId = m.platformMessageId ?? null;
      const externalCreatedAt = normalizeExternalCreatedAt(m.externalCreatedAt);
      const direction = m.direction || "INBOUND";

      const didInsert = await this.messageRepo.createMessageIfNotExists({
        threadId: thread.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content ?? "",
        platformMessageId,
        createdAt: nowMs(),
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

      if (didInsert) {
        inserted += 1;
        if (Number.isFinite(externalCreatedAt)) {
          lastSuccessfulItemAt = Math.max(lastSuccessfulItemAt ?? 0, externalCreatedAt);
        }
      }

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
