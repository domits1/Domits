import IntegrationAccountRepository from "../data/integrationAccountRepository.js";

const ok = (response) => ({ ok: true, statusCode: 200, response });
const bad = (statusCode, response) => ({ ok: false, statusCode, response });

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const getRawText = (payload) => {
  return typeof payload?.content === "string" ? payload.content.trim() : "";
};

export default class WhatsAppProviderAdapter {
  constructor() {
    this.integrationAccounts = new IntegrationAccountRepository();
  }

  async sendText({ thread, payload }) {
    if (!thread) {
      return bad(400, { error: "WhatsApp send requires an existing thread" });
    }

    if (thread.platform !== "WHATSAPP") {
      return bad(400, { error: "Thread platform is not WHATSAPP" });
    }

    const text = getRawText(payload);
    if (!text) {
      return bad(400, { error: "WhatsApp text message content is required" });
    }

    const integrationAccountId = thread.integrationAccountId || payload.integrationAccountId || null;
    if (!integrationAccountId) {
      return bad(400, { error: "Missing WhatsApp integrationAccountId" });
    }

    const integration = await this.integrationAccounts.getById(integrationAccountId);
    if (!integration) {
      return bad(404, { error: "WhatsApp integration account not found" });
    }

    if (integration.channel !== "WHATSAPP") {
      return bad(400, { error: "Integration account is not a WHATSAPP channel" });
    }

    if (integration.status !== "CONNECTED") {
      return bad(400, {
        error: "WhatsApp integration account is not connected",
        status: integration.status,
      });
    }

    const externalThreadId = thread.externalThreadId || payload.externalThreadId || thread.guestId || null;
    if (!isNonEmptyString(externalThreadId)) {
      return bad(400, { error: "Missing WhatsApp recipient thread identifier" });
    }

    return ok({
      accepted: true,
      mode: "placeholder",
      channel: "WHATSAPP",
      integrationAccountId: integration.id,
      externalAccountId: integration.externalAccountId,
      recipientWhatsAppId: externalThreadId,
      messageType: "text",
      text,
    });
  }

  async sendTemplate({ thread, payload }) {
    if (!thread || thread.platform !== "WHATSAPP") {
      return bad(400, { error: "Thread platform is not WHATSAPP" });
    }

    return bad(501, {
      error: "WhatsApp template sending is not implemented yet",
      threadId: thread.id,
      payload,
    });
  }

  async sendMedia({ thread, payload }) {
    if (!thread || thread.platform !== "WHATSAPP") {
      return bad(400, { error: "Thread platform is not WHATSAPP" });
    }

    return bad(501, {
      error: "WhatsApp media sending is not implemented yet",
      threadId: thread.id,
      payload,
    });
  }
}