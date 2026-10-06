import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import IngestionService from "./ingestionService.js";
import { normalizeChannexInboundMessage } from "./channexMessageNormalizer.js";

const ok = (response) => ({ statusCode: 200, response });
const forbidden = () => ({
  statusCode: 403,
  response: { error: "FORBIDDEN", message: "Invalid or missing Channex webhook secret." },
});

const safeJson = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const getSecretHeader = (event) =>
  event?.headers?.["x-channex-webhook-secret"] || event?.headers?.["X-Channex-Webhook-Secret"] || null;

export default class ChannexWebhookService {
  constructor({
    properties = new IntegrationPropertyRepository(),
    accounts = new IntegrationAccountRepository(),
    ingestionService = new IngestionService(),
    normalizeInboundMessage = normalizeChannexInboundMessage,
  } = {}) {
    this.properties = properties;
    this.accounts = accounts;
    this.ingestionService = ingestionService;
    this.normalizeInboundMessage = normalizeInboundMessage;
  }

  isSecretValid(event) {
    const expectedSecret = process.env.CHANNEX_WEBHOOK_SECRET || "";
    const providedSecret = getSecretHeader(event);
    return !!expectedSecret && providedSecret === expectedSecret;
  }

  async resolveContext(payload) {
    const mapping = await this.properties.findByExternalPropertyId(payload?.property_id);
    if (!mapping) {
      return null;
    }

    const integrationAccount = await this.accounts.getById(mapping?.integrationAccountId);

    return {
      integrationAccountId: mapping?.integrationAccountId,
      hostId: integrationAccount?.userId,
      propertyId: mapping?.domitsPropertyId,
      guestId: payload?.booking_id ? `CHANNEX_GUEST:${payload.booking_id}` : null,
    };
  }

  async handleWebhookEvent(event) {
    if (!this.isSecretValid(event)) {
      return forbidden();
    }

    const webhookEvent = safeJson(event?.body) || {};
    const context = await this.resolveContext(webhookEvent?.payload);
    if (!context) {
      return ok({ ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" });
    }

    const normalized = this.normalizeInboundMessage(webhookEvent, context);
    if (!normalized) {
      return ok({ ok: true, ingested: false, reason: "SKIPPED_NON_GUEST_SENDER" });
    }

    const result = await this.ingestionService.ingestExternalThread(normalized);
    return result;
  }
}
