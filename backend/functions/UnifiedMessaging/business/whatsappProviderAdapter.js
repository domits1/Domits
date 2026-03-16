import IntegrationAccountRepository from "../data/integrationAccountRepository.js";

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";

const badRequest = (message) => {
  const error = new Error(message);
  error.code = "WHATSAPP_BAD_REQUEST";
  return error;
};

const normalizeWhatsAppRecipient = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  return raw.replace(/[^\d]/g, "");
};

export default class WhatsAppProviderAdapter {
  constructor() {
    this.integrationAccounts = new IntegrationAccountRepository();
  }

  async sendMessage({
    integrationAccountId,
    recipientId,
    content,
    attachments = null,
  }) {
    if (!integrationAccountId) {
      throw badRequest("Missing integrationAccountId for WhatsApp send");
    }

    const integration = await this.integrationAccounts.getById(integrationAccountId);
    if (!integration) {
      throw badRequest("WhatsApp integration account not found");
    }

    const phoneNumberId = integration.externalAccountId || null;
    if (!phoneNumberId) {
      throw badRequest("WhatsApp integration is missing externalAccountId / phone_number_id");
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    if (!accessToken) {
      throw badRequest("Missing WHATSAPP_ACCESS_TOKEN");
    }

    const to = normalizeWhatsAppRecipient(recipientId);
    if (!to) {
      throw badRequest("Invalid WhatsApp recipientId");
    }

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    let payload;
    if (hasAttachments) {
      const first = attachments[0] || {};
      const attachmentUrl = first?.url || null;
      const attachmentType = String(first?.type || "").toLowerCase();

      if (!attachmentUrl) {
        throw badRequest("WhatsApp attachment is missing url");
      }

      if (attachmentType === "image") {
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: {
            link: attachmentUrl,
            caption: content || undefined,
          },
        };
      } else if (attachmentType === "document" || attachmentType === "file") {
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "document",
          document: {
            link: attachmentUrl,
            filename: first?.name || undefined,
            caption: content || undefined,
          },
        };
      } else if (attachmentType === "video") {
        payload = {
          messaging_product: "whatsapp",
          to,
          type: "video",
          video: {
            link: attachmentUrl,
            caption: content || undefined,
          },
        };
      } else {
        throw badRequest(`Unsupported WhatsApp attachment type: ${attachmentType || "unknown"}`);
      }
    } else {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: String(content || ""),
        },
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();
    let parsed = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const error = new Error(parsed?.error?.message || `WhatsApp send failed with status ${response.status}`);
      error.code = parsed?.error?.code || "WHATSAPP_SEND_FAILED";
      error.details = parsed || responseText;
      throw error;
    }

    const providerMessageId = parsed?.messages?.[0]?.id || null;

    return {
      accepted: true,
      mode: "live",
      channel: "WHATSAPP",
      integrationAccountId,
      externalAccountId: phoneNumberId,
      recipientWhatsAppId: to,
      messageType: payload.type,
      text: content || "",
      providerMessageId,
      rawResponse: parsed,
    };
  }
}