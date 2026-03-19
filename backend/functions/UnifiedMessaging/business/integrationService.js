import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import ReservationLinkRepository from "../data/reservationLinkRepository.js";

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";

const nowMs = () => Date.now();
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });

const requireStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

export default class IntegrationService {
  constructor() {
    this.accounts = new IntegrationAccountRepository();
    this.props = new IntegrationPropertyRepository();
    this.sync = new IntegrationSyncRepository();
    this.resLinks = new ReservationLinkRepository();
    this.runner = new SyncRunner();
    this.credentialStore = new WhatsAppCredentialStore();
  }

  async createIntegration(body) {
    const userId = requireStr(body.userId);
    const channel = requireStr(body.channel);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!channel) return bad(400, { error: "Missing required field: channel" });

    const id = randomUUID();
    const now = nowMs();

    const created = await this.accounts.create({
      id,
      userId,
      channel,
      externalAccountId: body.externalAccountId ?? null,
      displayName: body.displayName ?? null,
      status: body.status ?? "PENDING",
      credentialsRef: body.credentialsRef ?? null,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.sync.ensureStateRow(id, "MESSAGES");
    await this.sync.ensureStateRow(id, "RESERVATIONS");

    return ok(created);
  }

  async listIntegrations(userId) {
    if (!requireStr(userId)) return bad(400, { error: "Missing required query param: userId" });

    const items = await this.accounts.listByUserId(userId);

    const hydrated = await Promise.all(
      items.map(async (item) => {
        if (String(item?.channel || "").toUpperCase() !== "WHATSAPP") return item;
        if (!item?.credentialsRef) return item;

        try {
          const secret = await this.credentialStore.readSecret(item.credentialsRef);
          if (!secret?.expiresAt) return item;

          const expiresAt = Number(secret.expiresAt);
          const now = nowMs();

          if (Number.isFinite(expiresAt) && expiresAt <= now) {
            return {
              ...item,
              status: "RECONNECT_REQUIRED",
              lastErrorMessage: item.lastErrorMessage || "WhatsApp token expired. Reconnect required.",
            };
          }

          if (Number.isFinite(expiresAt) && expiresAt - now <= THREE_DAYS_MS) {
            return {
              ...item,
              status: "TOKEN_EXPIRING_SOON",
            };
          }

          return item;
        } catch {
          return item;
        }
      })
    );

    return ok(hydrated);
  }

  async updateIntegration(integrationId, patch) {
    const id = requireStr(integrationId);
    if (!id) return bad(400, { error: "Missing integration id in path" });

    const updated = await this.accounts.update(id, {
      externalAccountId: patch.externalAccountId,
      displayName: patch.displayName,
      status: patch.status,
      credentialsRef: patch.credentialsRef,
      lastErrorCode: patch.lastErrorCode,
      lastErrorMessage: patch.lastErrorMessage,
    });

    if (!updated) return bad(404, { error: "Integration not found" });
    return ok(updated);
  }

  async getIntegrationLogs(integrationId, limit = 50) {
    const id = requireStr(integrationId);
    if (!id) return bad(400, { error: "Missing integration id in path" });

    const logs = await this.sync.listLogs(id, Math.max(1, Math.min(limit, 200)));
    return ok(logs);
  }

  async upsertIntegrationProperty(integrationId, body) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const domitsPropertyId = requireStr(body.domitsPropertyId);
    const externalPropertyId = requireStr(body.externalPropertyId);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });

    const mapping = await this.props.upsert({
      integrationAccountId: accountId,
      domitsPropertyId,
      externalPropertyId,
      externalPropertyName: body.externalPropertyName ?? null,
      status: body.status ?? "ACTIVE",
    });

    return ok(mapping);
  }

  async listIntegrationProperties(integrationId) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const items = await this.props.listByAccountId(accountId);
    return ok(items);
  }

  async triggerSync(integrationId, syncType, body = {}) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const result = await this.runner.run({
      integrationAccountId: accountId,
      syncType,
      maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : 3,
      jobFn: async () => {
        return {
          itemsProcessed: 0,
          lastCursor: body.lastCursor ?? null,
          lastSuccessfulItemAt: null,
        };
      },
    });

    return ok(result);
  }

  async linkReservation(integrationId, body) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const channel = requireStr(body.channel);
    const externalReservationId = requireStr(body.externalReservationId);

    if (!channel) return bad(400, { error: "Missing required field: channel" });
    if (!externalReservationId) return bad(400, { error: "Missing required field: externalReservationId" });

    const saved = await this.resLinks.upsert({
      integrationAccountId: accountId,
      channel,
      externalReservationId,
      externalThreadId: body.externalThreadId ?? null,
      domitsThreadId: body.domitsThreadId ?? null,
      domitsPropertyId: body.domitsPropertyId ?? null,
      guestName: body.guestName ?? null,
      checkInAt: body.checkInAt ?? null,
      checkOutAt: body.checkOutAt ?? null,
      reservationStatus: body.reservationStatus ?? null,
      ratePlan: body.ratePlan ?? null,
      paymentStatus: body.paymentStatus ?? null,
      rawPayload: body.rawPayload
        ? typeof body.rawPayload === "string"
          ? body.rawPayload
          : JSON.stringify(body.rawPayload)
        : null,
    });

    return ok(saved);
  }

  async startWhatsAppConnect(body) {
    const userId = requireStr(body.userId);
    const callbackUrl = requireStr(body.callbackUrl);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!callbackUrl) return bad(400, { error: "Missing required field: callbackUrl" });

    const connectSessionId = randomUUID();

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connectSessionId,
      callbackUrl,
      nextStep: "meta_oauth",
    });
  }

  async completeWhatsAppConnect(body) {
    const userId = requireStr(body.userId);
    const connectSessionId = requireStr(body.connectSessionId);
    const code = requireStr(body.code);
    const callbackUrl = requireStr(body.callbackUrl);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!connectSessionId) return bad(400, { error: "Missing required field: connectSessionId" });
    if (!code) return bad(400, { error: "Missing required field: code" });
    if (!callbackUrl) return bad(400, { error: "Missing required field: callbackUrl" });

    /**
     * TODO: REAL META TOKEN EXCHANGE
     * Here the backend should:
     * 1. exchange `code` with Meta
     * 2. fetch WABA / phone numbers
     * 3. store token in Secrets Manager
     *
     * For now we return an empty list if no connected number exists yet.
     */

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");

    const selectableNumbers = existing?.externalAccountId
      ? [
          {
            phoneNumberId: existing.externalAccountId,
            displayName: existing.displayName || "WhatsApp Business Number",
            businessAccountId: null,
            phoneNumber: null,
          },
        ]
      : [];

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connectSessionId,
      codeReceived: true,
      selectableNumbers,
      credentialsRef: existing?.credentialsRef || null,
    });
  }

  async selectWhatsAppNumber(body) {
    const userId = requireStr(body.userId);
    const connectSessionId = requireStr(body.connectSessionId);
    const phoneNumberId = requireStr(body.phoneNumberId);
    const displayName = requireStr(body.displayName) || "WhatsApp Business Number";

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!connectSessionId) return bad(400, { error: "Missing required field: connectSessionId" });
    if (!phoneNumberId) return bad(400, { error: "Missing required field: phoneNumberId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");

    let integrationAccountId = existing?.id || randomUUID();
    let credentialsRef = existing?.credentialsRef || null;

    if (!credentialsRef) {
      credentialsRef = this.credentialStore.buildSecretName({
        userId,
        integrationAccountId,
      });
    }

    const issuedAt = nowMs();
    const expiresAt = issuedAt + SIXTY_DAYS_MS;

    await this.credentialStore.ensureSecret({
      userId,
      integrationAccountId,
      payload: {
        provider: "META_WHATSAPP",
        accessToken: null,
        /**
         * TODO:
         * Replace null with the real token returned by Meta token exchange.
         */
        issuedAt,
        expiresAt,
        refreshStatus: "NEEDS_REAL_META_TOKEN_EXCHANGE",
      },
    });

    let saved;
    if (existing) {
      saved = await this.accounts.update(existing.id, {
        externalAccountId: phoneNumberId,
        displayName,
        status: "CONNECTED",
        credentialsRef,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
    } else {
      const now = nowMs();

      saved = await this.accounts.create({
        id: integrationAccountId,
        userId,
        channel: "WHATSAPP",
        externalAccountId: phoneNumberId,
        displayName,
        status: "CONNECTED",
        credentialsRef,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdAt: now,
        updatedAt: now,
      });

      await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
      await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
    }

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connected: true,
      integration: saved,
    });
  }

  async disconnectWhatsApp(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });

    const disconnected = await this.accounts.disconnect(existing.id);
    if (!disconnected) return bad(404, { error: "WhatsApp integration not found" });

    return ok({
      disconnected: true,
      integration: disconnected,
    });
  }

  async checkWhatsAppTokenHealth(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });
    if (!existing.credentialsRef) return bad(400, { error: "Missing credentialsRef on integration" });

    const secret = await this.credentialStore.readSecret(existing.credentialsRef);
    if (!secret?.expiresAt) {
      return ok({
        status: "UNKNOWN",
        expiresAt: null,
        needsReconnect: false,
        message: "No token expiry metadata found.",
      });
    }

    const expiresAt = Number(secret.expiresAt);
    const now = nowMs();

    if (!Number.isFinite(expiresAt)) {
      return ok({
        status: "UNKNOWN",
        expiresAt: null,
        needsReconnect: false,
        message: "Invalid token expiry metadata.",
      });
    }

    if (expiresAt <= now) {
      await this.accounts.update(existing.id, {
        status: "RECONNECT_REQUIRED",
        lastErrorMessage: "WhatsApp token expired. Reconnect required.",
      });

      return ok({
        status: "EXPIRED",
        expiresAt,
        needsReconnect: true,
      });
    }

    if (expiresAt - now <= THREE_DAYS_MS) {
      return ok({
        status: "EXPIRING_SOON",
        expiresAt,
        needsReconnect: false,
      });
    }

    return ok({
      status: "HEALTHY",
      expiresAt,
      needsReconnect: false,
    });
  }

  async refreshWhatsAppToken(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });
    if (!existing.credentialsRef) return bad(400, { error: "Missing credentialsRef on integration" });

    const secret = await this.credentialStore.readSecret(existing.credentialsRef);
    if (!secret) return bad(404, { error: "WhatsApp secret not found" });

    /**
     * TODO: REAL META TOKEN REFRESH
     * Meta says expiring system user tokens are valid for 60 days from generated or refreshed date
     * and should be refreshed within that period. We are not guessing the refresh endpoint here.
     *
     * Replace the block below with the real Meta refresh call and real returned token.
     */
    const refreshedAt = nowMs();
    const nextExpiresAt = refreshedAt + SIXTY_DAYS_MS;

    await this.credentialStore.writeSecret(existing.credentialsRef, {
      ...secret,
      refreshedAt,
      expiresAt: nextExpiresAt,
      refreshStatus: "PLACEHOLDER_REFRESHED",
    });

    await this.accounts.update(existing.id, {
      status: "CONNECTED",
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    return ok({
      refreshed: true,
      expiresAt: nextExpiresAt,
      mode: "placeholder-refresh",
    });
  }
}