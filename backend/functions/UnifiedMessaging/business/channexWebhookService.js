import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import IngestionService from "./ingestionService.js";
import { normalizeChannexInboundMessage } from "./channexMessageNormalizer.js";
import { badRequest } from "../util/httpErrors.js";

const MESSAGE_THREAD_BOOKING_ASSIGNED_EVENT = "message_thread_booking_assigned";

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
    threads = new ThreadRepository(),
  } = {}) {
    this.properties = properties;
    this.accounts = accounts;
    this.ingestionService = ingestionService;
    this.normalizeInboundMessage = normalizeInboundMessage;
    this.threads = threads;
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

  async handleBookingAssignedEvent(webhookEvent) {
    const payload = webhookEvent?.payload || {};

    if (!payload.booking_id) {
      throw badRequest("Channex message_thread_booking_assigned payload.booking_id is required.");
    }
    if (!payload.message_thread_id) {
      throw badRequest("Channex message_thread_booking_assigned payload.message_thread_id is required.");
    }

    const context = await this.resolveContext({
      property_id: webhookEvent?.property_id,
      booking_id: payload.booking_id,
    });
    if (!context) {
      return ok({ ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" });
    }

    const thread = await this.threads.findExternalThread({
      integrationAccountId: context.integrationAccountId,
      platform: "CHANNEX",
      externalThreadId: payload.message_thread_id,
    });
    if (!thread) {
      return ok({ ok: true, ingested: false, reason: "THREAD_NOT_FOUND" });
    }

    if (thread.guestId === context.guestId) {
      return ok({ ok: true });
    }

    await this.threads.updateThreadGuestId(thread.id, context.guestId);
    return ok({ ok: true });
  }

  async handleWebhookEvent(event) {
    if (!this.isSecretValid(event)) {
      return forbidden();
    }

    const webhookEvent = safeJson(event?.body) || {};

    if (webhookEvent?.event === MESSAGE_THREAD_BOOKING_ASSIGNED_EVENT) {
      return this.handleBookingAssignedEvent(webhookEvent);
    }

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
