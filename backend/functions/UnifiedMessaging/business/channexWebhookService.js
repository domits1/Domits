import { timingSafeEqual } from "node:crypto";

import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import ThreadRepository from "../data/threadRepository.js";
import IngestionService from "./ingestionService.js";
import { normalizeChannexInboundMessage } from "./channexMessageNormalizer.js";
import { CHANNEX_STATUS } from "../.shared/channelManagement/channelManagementConstants.js";
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
    const providedSecret = getSecretHeader(event) || "";

    if (!expectedSecret || !providedSecret) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedSecret);
    const providedBuffer = Buffer.from(providedSecret);

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  async resolveContext(payload) {
    const mappings = await this.properties.findByExternalPropertyId(payload?.property_id);
    if (!Array.isArray(mappings) || mappings.length === 0) {
      console.warn("No ACTIVE Channex property mapping found", payload?.property_id);
      return null;
    }

    if (mappings.length > 1) {
      console.warn("Multiple ACTIVE Channex property mappings found", payload?.property_id, mappings.length);
    }

    const mapping = mappings[0];
    const integrationAccount = await this.accounts.getById(mapping?.integrationAccountId);

    if (!integrationAccount) {
      console.warn("Channex property mapping account invalid", payload?.property_id, "ACCOUNT_NOT_FOUND");
      return null;
    }
    if (integrationAccount.channel !== "CHANNEX") {
      console.warn("Channex property mapping account invalid", payload?.property_id, "ACCOUNT_WRONG_CHANNEL");
      return null;
    }
    if (integrationAccount.status === CHANNEX_STATUS.DISCONNECTED) {
      console.warn("Channex property mapping account invalid", payload?.property_id, "ACCOUNT_DISCONNECTED");
      return null;
    }

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

    const webhookEvent = safeJson(event?.body);
    if (!webhookEvent) {
      return { statusCode: 400, response: { error: "Invalid JSON body" } };
    }

    if (webhookEvent?.event === MESSAGE_THREAD_BOOKING_ASSIGNED_EVENT) {
      return this.handleBookingAssignedEvent(webhookEvent);
    }

    if (webhookEvent?.event !== "message") {
      return ok({ ok: true, ingested: false, reason: "EVENT_IGNORED" });
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
