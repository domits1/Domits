import crypto from "node:crypto";

import IngestionService from "./ingestionService.js";
import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import MessageRepository from "../data/messageRepository.js";
import publishRealtimeMessage from "./publishRealtimeMessage.js";

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

const extractFileUrls = (attachments) => {
  const arr = Array.isArray(attachments) ? attachments : [];
  return arr.map((item) => item?.url).filter(Boolean);
};

const mapDeliveryStatus = (statusValue) => {
  const s = String(statusValue || "").toLowerCase();
  if (["sent", "delivered", "read", "failed"].includes(s)) return s;
  return "pending";
};

const computeMetaSignature = (appSecret, rawBody) => {
  return `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody || "", "utf8").digest("hex")}`;
};

const getSignatureHeader = (event) =>
  event?.headers?.["x-hub-signature-256"] || event?.headers?.["X-Hub-Signature-256"] || null;

const buildInboundThreadPayload = ({ integration, guestPhone, fallbackGuestName, phoneNumberId, metadata, message }) => ({
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

const buildStatusUpdatePayload = (integration, status) => ({
  integrationAccountId: integration.id,
  platformMessageId: status?.id || null,
  deliveryStatus: mapDeliveryStatus(status?.status),
  externalCreatedAt: normalizeTimestampMs(status?.timestamp),
  conversation: status?.conversation || null,
  pricing: status?.pricing || null,
  errorCode: status?.errors?.[0]?.code || null,
  errorMessage: status?.errors?.[0]?.title || null,
  rawStatus: status,
});

export default class WhatsAppService {
  constructor() {
    this.ingestionService = new IngestionService();
    this.integrationAccounts = new IntegrationAccountRepository();
    this.messageRepository = new MessageRepository();
  }

  async publishInboundThreadMessages(threadPayload, resolvedThreadId) {
    for (const msg of asArray(threadPayload.messages)) {
      await publishRealtimeMessage({
        senderId: msg.senderId,
        userId: msg.senderId,
        recipientId: msg.recipientId,
        text: msg.content || "",
        content: msg.content || "",
        fileUrls: extractFileUrls(msg.attachments),
        attachments: msg.attachments || null,
        threadId: resolvedThreadId,
        propertyId: threadPayload.propertyId || null,
        metadata: msg.metadata || {},
        createdAt: msg.externalCreatedAt || Date.now(),
        platform: "WHATSAPP",
        integrationAccountId: threadPayload.integrationAccountId,
        externalThreadId: threadPayload.externalThreadId,
        type: "message",
      });
    }
  }

  async processInboundThreads(inboundThreads) {
    const ingestionResults = [];

    for (const threadPayload of inboundThreads) {
      const result = await this.ingestionService.ingestExternalThread(threadPayload);

      ingestionResults.push({
        integrationAccountId: threadPayload.integrationAccountId,
        externalThreadId: threadPayload.externalThreadId,
        statusCode: result?.statusCode || 200,
        response: result?.response || null,
      });

      const insertedMessages = Number(result?.response?.insertedMessages || 0);
      const resolvedThreadId = result?.response?.threadId || null;
      if (insertedMessages > 0 && resolvedThreadId) {
        await this.publishInboundThreadMessages(threadPayload, resolvedThreadId);
      }
    }

    return ingestionResults;
  }

  async processStatusUpdates(statusUpdates) {
    const statusResults = [];

    for (const statusItem of statusUpdates) {
      const updated = await this.messageRepository.updateMessageStatusByPlatformMessageId(
        statusItem.platformMessageId,
        {
          deliveryStatus: statusItem.deliveryStatus,
          errorCode: statusItem.errorCode,
          errorMessage: statusItem.errorMessage,
          metadataPatch: {
            whatsappStatus: statusItem.deliveryStatus,
            whatsappConversation: statusItem.conversation,
            whatsappPricing: statusItem.pricing,
            whatsappStatusRaw: statusItem.rawStatus,
            whatsappStatusUpdatedAt: statusItem.externalCreatedAt,
          },
        }
      );

      statusResults.push({
        platformMessageId: statusItem.platformMessageId,
        matched: !!updated,
        deliveryStatus: statusItem.deliveryStatus,
      });

      if (!updated) {
        console.log(
          "WhatsApp status update did not match an existing platformMessageId:",
          statusItem.platformMessageId
        );
      }
    }

    return statusResults;
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

    const signatureHeader = getSignatureHeader(event);
    const appSecret = process.env.WHATSAPP_APP_SECRET || "";

    if (appSecret && signatureHeader) {
      const expected = computeMetaSignature(appSecret, rawBody);
      if (signatureHeader !== expected) {
        return bad(401, { error: "Invalid WhatsApp signature" });
      }
    }

    const normalized = await this.normalizeWebhookPayload(body);
    const ingestionResults = await this.processInboundThreads(normalized.inboundThreads);
    const statusResults = await this.processStatusUpdates(normalized.statusUpdates);

    return ok({
      ok: true,
      processedInboundThreads: ingestionResults.length,
      processedStatusUpdates: statusResults.length,
      ingestionResults,
      statusResults,
    });
  }

  async resolveIntegrationAccount(phoneNumberId) {
    if (phoneNumberId) {
      const direct = await this.integrationAccounts.findByChannelAndExternalAccountId("WHATSAPP", phoneNumberId);
      if (direct) return direct;
    }

    const allWhatsAppIntegrations = await this.integrationAccounts.listByChannel("WHATSAPP");

    if (allWhatsAppIntegrations.length === 1) {
      console.log(
        "WhatsApp webhook fallback: using single WHATSAPP integration for phone_number_id",
        phoneNumberId
      );
      return allWhatsAppIntegrations[0];
    }

    return null;
  }

  async collectWebhookChangePayloads(change, inboundThreads, statusUpdates) {
    const value = change?.value || {};
    const metadata = value?.metadata || {};
    const phoneNumberId = metadata?.phone_number_id || null;

    const integration = await this.resolveIntegrationAccount(phoneNumberId);

    if (!integration) {
      console.log("WhatsApp webhook skipped: no integration account found for phone_number_id", phoneNumberId);
      return;
    }

    const contacts = asArray(value?.contacts);
    const fallbackGuestPhone = contacts?.[0]?.wa_id || null;
    const fallbackGuestName = contacts?.[0]?.profile?.name || null;

    const inboundMessages = asArray(value?.messages);
    for (const message of inboundMessages) {
      const guestPhone = message?.from || fallbackGuestPhone || null;
      if (!guestPhone) continue;

      inboundThreads.push(
        buildInboundThreadPayload({ integration, guestPhone, fallbackGuestName, phoneNumberId, metadata, message })
      );
    }

    const statuses = asArray(value?.statuses);
    for (const status of statuses) {
      statusUpdates.push(buildStatusUpdatePayload(integration, status));
    }
  }

  async normalizeWebhookPayload(body) {
    const inboundThreads = [];
    const statusUpdates = [];
    const entries = asArray(body?.entry);

    for (const entry of entries) {
      const changes = asArray(entry?.changes);

      for (const change of changes) {
        await this.collectWebhookChangePayloads(change, inboundThreads, statusUpdates);
      }
    }

    return {
      inboundThreads,
      statusUpdates,
    };
  }
}
