import crypto from "node:crypto";

import IngestionService from "./ingestionService.js";
import IntegrationAccountRepository from "../data/integrationAccountRepository.js";

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });

const safeJson = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeTimestampMs = (value) => {
  if (value == null) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d+$/.test(str)) {
    const n = Number(str);
    return n < 1_000_000_000_000 ? n * 1000 : n;
  }

  const parsed = new Date(str).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const getTextContent = (message) => {
  if (!message || typeof message !== "object") return "";

  if (message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  if (message?.caption) return String(message.caption);

  const type = message?.type || "unknown";
  return `[WhatsApp ${type} message]`;
};

const getAttachmentPayload = (message) => {
  if (!message || typeof message !== "object") return null;

  const type = message?.type || null;
  if (!type) return null;

  const mediaTypes = ["image", "video", "audio", "document", "sticker"];
  if (!mediaTypes.includes(type)) return null;

  const media = message?.[type];
  if (!media || typeof media !== "object") return null;

  return [
    {
      type,
      mediaId: media.id || null,
      mimeType: media.mime_type || null,
      sha256: media.sha256 || null,
      filename: media.filename || null,
      caption: media.caption || null,
    },
  ];
};

const mapDirectionFromStatus = (statusValue) => {
  const s = String(statusValue || "").toLowerCase();
  if (s === "sent" || s === "delivered" || s === "read" || s === "failed") return "OUTBOUND";
  return "SYSTEM";
};

const mapDeliveryStatus = (statusValue) => {
  const s = String(statusValue || "").toLowerCase();
  if (["sent", "delivered", "read", "failed"].includes(s)) return s;
  return "pending";
};

const computeMetaSignature = (appSecret, rawBody) => {
  return `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody || "", "utf8").digest("hex")}`;
};

export default class WhatsAppService {
  constructor() {
    this.ingestionService = new IngestionService();
    this.integrationAccounts = new IntegrationAccountRepository();
  }

  async verifyWebhook(event) {
    const qs = event?.queryStringParameters || {};
    const mode = qs["hub.mode"];
    const token = qs["hub.verify_token"];
    const challenge = qs["hub.challenge"];

    const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

    if (mode === "subscribe" && token && expectedVerifyToken && token === expectedVerifyToken) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        rawBody: String(challenge || ""),
      };
    }

    return bad(403, { error: "Webhook verification failed" });
  }

  async handleWebhookEvent(event) {
    const rawBody = event?.body || "";
    const body = safeJson(rawBody);

    if (!body) {
      return bad(400, { error: "Invalid JSON body" });
    }

    const signatureHeader =
      event?.headers?.["x-hub-signature-256"] ||
      event?.headers?.["X-Hub-Signature-256"] ||
      null;

    const appSecret = process.env.WHATSAPP_APP_SECRET || "";

    if (appSecret && signatureHeader) {
      const expected = computeMetaSignature(appSecret, rawBody);
      if (signatureHeader !== expected) {
        return bad(401, { error: "Invalid WhatsApp signature" });
      }
    }

    const normalizedThreads = await this.normalizeWebhookPayload(body);

    const results = [];
    for (const threadPayload of normalizedThreads) {
      const result = await this.ingestionService.ingestExternalThread(threadPayload);
      results.push({
        integrationAccountId: threadPayload.integrationAccountId,
        externalThreadId: threadPayload.externalThreadId,
        statusCode: result?.statusCode || 200,
        response: result?.response || null,
      });
    }

    return ok({
      ok: true,
      processedThreads: results.length,
      results,
    });
  }

  async normalizeWebhookPayload(body) {
    const threads = [];
    const entries = asArray(body?.entry);

    for (const entry of entries) {
      const changes = asArray(entry?.changes);

      for (const change of changes) {
        const value = change?.value || {};
        const metadata = value?.metadata || {};
        const phoneNumberId = metadata?.phone_number_id || null;

        const integration = phoneNumberId
          ? await this.integrationAccounts.findByChannelAndExternalAccountId("WHATSAPP", phoneNumberId)
          : null;

        if (!integration) {
          console.log("WhatsApp webhook skipped: no integration account found for phone_number_id", phoneNumberId);
          continue;
        }

        const contacts = asArray(value?.contacts);
        const fallbackGuestPhone = contacts?.[0]?.wa_id || null;
        const fallbackGuestName = contacts?.[0]?.profile?.name || null;

        const inboundMessages = asArray(value?.messages);
        for (const message of inboundMessages) {
          const guestPhone = message?.from || fallbackGuestPhone || null;
          if (!guestPhone) continue;

          threads.push({
            integrationAccountId: integration.id,
            platform: "WHATSAPP",
            externalThreadId: guestPhone,
            hostId: integration.userId,
            guestId: guestPhone,
            propertyId: null,
            status: "OPEN",
            messages: [
              {
                platformMessageId: message?.id || null,
                senderId: guestPhone,
                recipientId: integration.userId,
                content: getTextContent(message),
                externalCreatedAt: normalizeTimestampMs(message?.timestamp),
                direction: "INBOUND",
                externalSenderType: "GUEST",
                metadata: {
                  channel: "WHATSAPP",
                  guestName: fallbackGuestName,
                  phoneNumberId,
                  displayPhoneNumber: metadata?.display_phone_number || null,
                  messageType: message?.type || null,
                  rawMessage: message,
                },
                attachments: getAttachmentPayload(message),
              },
            ],
          });
        }

        const statuses = asArray(value?.statuses);
        for (const status of statuses) {
          const guestPhone = status?.recipient_id || null;
          if (!guestPhone) continue;

          threads.push({
            integrationAccountId: integration.id,
            platform: "WHATSAPP",
            externalThreadId: guestPhone,
            hostId: integration.userId,
            guestId: guestPhone,
            propertyId: null,
            status: "OPEN",
            messages: [
              {
                platformMessageId: status?.id || null,
                senderId: integration.userId,
                recipientId: guestPhone,
                content: `[WhatsApp status: ${status?.status || "unknown"}]`,
                externalCreatedAt: normalizeTimestampMs(status?.timestamp),
                direction: mapDirectionFromStatus(status?.status),
                externalSenderType: "SYSTEM",
                complianceStatus: null,
                errorCode: status?.errors?.[0]?.code || null,
                errorMessage: status?.errors?.[0]?.title || null,
                metadata: {
                  channel: "WHATSAPP",
                  phoneNumberId,
                  displayPhoneNumber: metadata?.display_phone_number || null,
                  status: status?.status || null,
                  conversation: status?.conversation || null,
                  pricing: status?.pricing || null,
                  rawStatus: status,
                },
                attachments: null,
              },
            ],
          });
        }
      }
    }

    return threads;
  }
}