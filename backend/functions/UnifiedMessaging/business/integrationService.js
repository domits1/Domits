import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import ReservationLinkRepository from "../data/reservationLinkRepository.js";

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";
import HoliduCredentialStore from "./holiduCredentialStore.js";
import {
  normalizeHoliduCredentials,
  buildHoliduSecretPayload,
  buildHoliduCredentialSummary,
} from "./holiduCredentialUtils.js";

const nowMs = () => Date.now();
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";
const PLACEHOLDER_REFRESH_STATUSES = new Set([
  "NEEDS_REAL_META_TOKEN_EXCHANGE",
  "PLACEHOLDER_REFRESHED",
]);

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });

const requireStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const requireEnv = (name) => {
  const value = requireStr(process.env[name]);
  if (!value) {
    const error = new Error(`Missing required env var: ${name}`);
    error.code = "MISSING_ENV";
    throw error;
  }
  return value;
};
const hasConfiguredEnvToken = () => !!requireStr(process.env.WHATSAPP_ACCESS_TOKEN);
const hasUsableSecretAccessToken = (secret) => !!requireStr(secret?.accessToken);
const isPlaceholderRefreshStatus = (value) => PLACEHOLDER_REFRESH_STATUSES.has(String(value || "").trim().toUpperCase());
const normalizeGraphPath = (path) => String(path || "").replace(/^\/+/, "");
const normalizeExpiresAt = (value) => {
  if (value == null) return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const normalizeExpiresIn = (value) => {
  if (value == null) return null;
  return Number(value);
};
const resolveTokenSource = (integration, secret) => {
  if (integration?.credentialsRef) {
    return hasUsableSecretAccessToken(secret) ? "SECRET" : "NONE";
  }

  return hasConfiguredEnvToken() ? "ENV" : "NONE";
};
const buildTokenState = ({
  status,
  needsReconnect,
  expiresAt,
  reliableExpiry,
  tokenSource,
  cause,
  message,
  shouldPersistReconnect,
}) => ({
  status,
  needsReconnect,
  expiresAt,
  reliableExpiry,
  tokenSource,
  cause,
  message,
  shouldPersistReconnect,
});
const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const out = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};
const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const parseTokenResponse = (rawText) => {
  const parsedJson = parseJsonSafely(rawText);
  if (parsedJson && typeof parsedJson === "object") return parsedJson;

  const params = new URLSearchParams(String(rawText || ""));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  return {
    access_token: accessToken,
    token_type: params.get("token_type") || null,
    expires_in: params.get("expires_in") || null,
  };
};
const categorizeMetaError = (error) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  if (code === "100" || message.includes("missing permission")) return "permission_denied";
  if (code === "190" || message.includes("invalid oauth")) return "invalid_token";
  if (message.includes("expired")) return "expired";
  if (message.includes("rate limit")) return "rate_limited";
  if (message.includes("not found") || message.includes("unsupported get request")) return "not_found";
  return "graph_request_failed";
};
const serializeRawPayload = (rawPayload) => {
  if (!rawPayload) return null;
  return typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload);
};

export default class IntegrationService {
  constructor() {
    this.accounts = new IntegrationAccountRepository();
    this.props = new IntegrationPropertyRepository();
    this.sync = new IntegrationSyncRepository();
    this.resLinks = new ReservationLinkRepository();
    this.runner = new SyncRunner();
    this.credentialStore = new WhatsAppCredentialStore();
    this.holiduCredentialStore = new HoliduCredentialStore();
  }

  logTokenLifecycle(level, message, integration, cause, extra = {}) {
    console[level](
      message,
      JSON.stringify({
        integrationAccountId: integration?.id || null,
        userId: integration?.userId || null,
        cause,
        ...extra,
      })
    );
  }

  evaluateWhatsAppTokenState(integration, secret) {
    const tokenSource = resolveTokenSource(integration, secret);

    if (!integration?.credentialsRef) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_credentials_ref",
        message: "WhatsApp credentials are not configured in Secrets Manager. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (!secret) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_secret",
        message: "WhatsApp credentials secret is missing. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (!hasUsableSecretAccessToken(secret)) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_access_token",
        message: "WhatsApp access token is missing from the stored credentials. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (isPlaceholderRefreshStatus(secret?.refreshStatus)) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: normalizeExpiresAt(secret?.expiresAt),
        reliableExpiry: false,
        tokenSource,
        cause: "placeholder_token_metadata",
        message: "WhatsApp token metadata is placeholder-only and cannot be trusted for lifecycle management.",
        shouldPersistReconnect: false,
      });
    }

    if (secret?.expiresAt == null) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_expiry_metadata",
        message: "WhatsApp token expiry metadata is unavailable.",
        shouldPersistReconnect: false,
      });
    }

    const expiresAt = normalizeExpiresAt(secret?.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "invalid_expiry_metadata",
        message: "WhatsApp token expiry metadata is invalid.",
        shouldPersistReconnect: false,
      });
    }

    const now = nowMs();
    if (expiresAt <= now) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt,
        reliableExpiry: true,
        tokenSource,
        cause: "expired_token",
        message: "WhatsApp token expired. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (expiresAt - now <= THREE_DAYS_MS) {
      return buildTokenState({
        status: "EXPIRING_SOON",
        needsReconnect: false,
        expiresAt,
        reliableExpiry: true,
        tokenSource,
        cause: "expiring_soon",
        message: "WhatsApp token is expiring soon.",
        shouldPersistReconnect: false,
      });
    }

    return buildTokenState({
      status: "HEALTHY",
      needsReconnect: false,
      expiresAt,
      reliableExpiry: true,
      tokenSource,
      cause: "healthy",
      message: "WhatsApp token is configured and expiry metadata is available.",
      shouldPersistReconnect: false,
    });
  }

  async persistReconnectRequired(integration, cause, message, errorCode = "WHATSAPP_RECONNECT_REQUIRED") {
    this.logTokenLifecycle("warn", "WhatsApp reconnect required", integration, cause, {
      status: "RECONNECT_REQUIRED",
    });

    await this.accounts.update(integration.id, {
      status: "RECONNECT_REQUIRED",
      lastErrorCode: errorCode,
      lastErrorMessage: message,
    });
  }

  async metaGraphRequest({ path, accessToken, method = "GET", query = {} }) {
    const token = requireStr(accessToken);
    if (!token) {
      const error = new Error("Missing Meta access token");
      error.code = "MISSING_ACCESS_TOKEN";
      throw error;
    }

    const normalizedPath = normalizeGraphPath(path);
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${normalizedPath}`);
    for (const [key, value] of Object.entries(query || {})) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    console.log(
      "WhatsApp Graph request",
      JSON.stringify({
        path: normalizedPath,
        method,
      })
    );

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);

    if (!response.ok) {
      const error = new Error(parsed?.error?.message || `Meta Graph request failed with status ${response.status}`);
      error.code = parsed?.error?.code || "META_GRAPH_REQUEST_FAILED";
      error.details = parsed || rawText;
      error.graphPath = normalizedPath;
      error.responseCategory = categorizeMetaError(error);
      console.warn(
        "WhatsApp Graph request failed",
        JSON.stringify({
          path: error.graphPath,
          method,
          causeCode: error.code,
          responseCategory: error.responseCategory,
        })
      );
      throw error;
    }

    return parsed || {};
  }

  async exchangeWhatsAppCode({ code, redirectUri }) {
    const clientId = requireEnv("WHATSAPP_APP_ID");
    const clientSecret = requireEnv("WHATSAPP_APP_SECRET");

    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);

    const response = await fetch(url, { method: "GET" });
    const rawText = await response.text();
    const parsed = parseTokenResponse(rawText);

    if (!response.ok) {
      const details = parseJsonSafely(rawText) || rawText;
      const error = new Error(
        (typeof details === "object" && details?.error?.message) || `Meta token exchange failed with status ${response.status}`
      );
      error.code = (typeof details === "object" && details?.error?.code) || "META_TOKEN_EXCHANGE_FAILED";
      error.details = details;
      console.warn(
        "WhatsApp code exchange failed",
        JSON.stringify({
          causeCode: error.code,
          responseCategory: categorizeMetaError(error),
          hasExpiresIn: false,
          hasTokenType: false,
        })
      );
      throw error;
    }

    if (!parsed?.access_token) {
      const error = new Error("Meta token exchange succeeded but no access token was returned");
      error.code = "META_TOKEN_MISSING";
      throw error;
    }

    console.log(
      "WhatsApp code exchange succeeded",
      JSON.stringify({
        hasExpiresIn: parsed.expires_in != null,
        hasTokenType: !!parsed.token_type,
      })
    );

    return {
      accessToken: parsed.access_token,
      tokenType: parsed.token_type || "bearer",
      expiresIn: normalizeExpiresIn(parsed.expires_in),
    };
  }

  async fetchBusinessWabasForBusinessId({ accessToken, businessId, businessName = null, source = "business_id" }) {
    const wabas = [];
    for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"]) {
      try {
        const response = await this.metaGraphRequest({
          path: `${businessId}/${edge}`,
          accessToken,
          query: {
            fields: "id,name",
            limit: 100,
          },
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        for (const row of rows) {
          const wabaId = requireStr(row?.id);
          if (!wabaId) continue;

          wabas.push({
            businessId,
            businessName: businessName || row?.name || null,
            wabaId,
            wabaName: row?.name || null,
            source,
          });
        }
      } catch (error) {
        console.warn(
          "WhatsApp asset edge lookup failed",
          JSON.stringify({
            path: `${businessId}/${edge}`,
            businessId,
            causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
            responseCategory: error?.responseCategory || categorizeMetaError(error),
          })
        );
      }
    }

    return uniqueBy(wabas, (item) => `${item.businessId}:${item.wabaId}`);
  }

  async fetchWhatsAppBusinessAccounts(accessToken) {
    const aggregated = [];
    const fallbackBusinessId = requireStr(process.env.WHATSAPP_BUSINESS_ID);
    const fallbackWabaId = requireStr(process.env.WHATSAPP_WABA_ID);
    let meBusinessesError = null;

    try {
      const businesses = await this.metaGraphRequest({
        path: "me/businesses",
        accessToken,
        query: {
          fields: "id,name",
          limit: 100,
        },
      });

      const businessRows = Array.isArray(businesses?.data) ? businesses.data : [];
      for (const business of businessRows) {
        const businessId = requireStr(business?.id);
        if (!businessId) continue;

        const wabas = await this.fetchBusinessWabasForBusinessId({
          accessToken,
          businessId,
          businessName: business?.name || null,
          source: "me/businesses",
        });

        aggregated.push(...wabas);
      }
    } catch (error) {
      meBusinessesError = error;
      console.warn(
        "WhatsApp business discovery failed on me/businesses",
        JSON.stringify({
          path: "me/businesses",
          causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
          responseCategory: error?.responseCategory || categorizeMetaError(error),
        })
      );
    }

    if (aggregated.length === 0 && fallbackBusinessId) {
      const wabas = await this.fetchBusinessWabasForBusinessId({
        accessToken,
        businessId: fallbackBusinessId,
        businessName: null,
        source: "env_business_id",
      });

      aggregated.push(...wabas);
    }

    if (aggregated.length === 0 && fallbackWabaId) {
      aggregated.push({
        businessId: fallbackBusinessId || null,
        businessName: null,
        wabaId: fallbackWabaId,
        wabaName: null,
        source: "env_waba_id",
      });
    }

    const uniqueAccounts = uniqueBy(aggregated, (item) => `${item.businessId || "none"}:${item.wabaId}`);
    if (uniqueAccounts.length > 0) {
      return uniqueAccounts;
    }

    const error = new Error(
      "WhatsApp code exchange succeeded, but business asset discovery failed due to permission or scope limitations in the current token flow."
    );
    error.code = meBusinessesError?.code || "WHATSAPP_ASSET_DISCOVERY_FAILED";
    error.responseCategory = meBusinessesError?.responseCategory || "permission_denied";
    error.details = {
      meBusinessesFailed: !!meBusinessesError,
      usedBusinessIdFallback: !!fallbackBusinessId,
      usedWabaIdFallback: !!fallbackWabaId,
    };
    throw error;
  }

  async fetchWhatsAppSelectableNumbers(accessToken) {
    const businessAccounts = await this.fetchWhatsAppBusinessAccounts(accessToken);
    const numbers = [];

    for (const account of businessAccounts) {
      try {
        const response = await this.metaGraphRequest({
          path: `${account.wabaId}/phone_numbers`,
          accessToken,
          query: {
            fields: "id,display_phone_number,verified_name",
            limit: 100,
          },
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        for (const row of rows) {
          const phoneNumberId = requireStr(row?.id);
          if (!phoneNumberId) continue;

          numbers.push({
            phoneNumberId,
            displayName: row?.verified_name || row?.display_phone_number || account.wabaName || "WhatsApp Business Number",
            businessAccountId: account.wabaId,
            businessId: account.businessId,
            businessName: account.businessName,
            phoneNumber: row?.display_phone_number || null,
          });
        }
      } catch (error) {
        console.warn(
          "WhatsApp phone number lookup failed",
          JSON.stringify({
            path: `${account.wabaId}/phone_numbers`,
            businessAccountId: account.wabaId,
            businessId: account.businessId,
            causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
            responseCategory: error?.responseCategory || categorizeMetaError(error),
          })
        );
      }
    }

    const uniqueNumbers = uniqueBy(numbers, (item) => item.phoneNumberId);
    if (uniqueNumbers.length > 0) {
      return uniqueNumbers;
    }

    const error = new Error(
      "WhatsApp code exchange succeeded, but no phone numbers could be discovered from the accessible business assets."
    );
    error.code = "WHATSAPP_PHONE_DISCOVERY_FAILED";
    error.responseCategory = "permission_denied";
    throw error;
  }

  async hydrateListedIntegration(item) {
    if (String(item?.channel || "").toUpperCase() !== "WHATSAPP") {
      return item;
    }

    try {
      const secret = await this.credentialStore.readSecretOrNull(item.credentialsRef);
      const evaluation = this.evaluateWhatsAppTokenState(item, secret);
      const preservesExistingError =
        evaluation.status === "HEALTHY" || evaluation.status === "EXPIRING_SOON";

      return {
        ...item,
        status: evaluation.status === "EXPIRING_SOON" ? "TOKEN_EXPIRING_SOON" : evaluation.status,
        lastErrorMessage: preservesExistingError ? item.lastErrorMessage : evaluation.message,
      };
    } catch (error) {
      this.logTokenLifecycle("warn", "WhatsApp token health evaluation failed during list", item, "health_check_error", {
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
      });
      return {
        ...item,
        status: "UNKNOWN",
        lastErrorMessage: item.lastErrorMessage || "Unable to evaluate WhatsApp token health.",
      };
    }
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
    const hydrated = await Promise.all(items.map((item) => this.hydrateListedIntegration(item)));
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
      rawPayload: serializeRawPayload(body.rawPayload),
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

  async connectHolidu(body) {
    const userId = requireStr(body.userId);
    const displayName = requireStr(body.displayName) || "Holidu";
    const externalAccountId = requireStr(body.externalAccountId);
    const credentials = normalizeHoliduCredentials(body.credentials);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!credentials) {
      return bad(400, {
        error: "Missing required field: credentials. Provide at least one Holidu credential value.",
      });
    }

    const existing = await this.accounts.findByUserIdAndChannel(userId, "HOLIDU");
    const integrationAccountId = existing?.id || randomUUID();
    const connectedAt = existing?.createdAt || nowMs();
    const updatedAt = nowMs();

    const credentialsRef = await this.holiduCredentialStore.ensureSecret({
      userId,
      integrationAccountId,
      payload: buildHoliduSecretPayload({
        credentials,
        connectedAt,
        updatedAt,
      }),
    });

    let integration;
    if (existing) {
      integration = await this.accounts.update(existing.id, {
        displayName,
        externalAccountId,
        status: "CONNECTED",
        credentialsRef,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
    } else {
      integration = await this.accounts.create({
        id: integrationAccountId,
        userId,
        channel: "HOLIDU",
        externalAccountId,
        displayName,
        status: "CONNECTED",
        credentialsRef,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdAt: connectedAt,
        updatedAt,
      });

      await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
      await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
    }

    return ok({
      connected: true,
      channel: "HOLIDU",
      integration,
      credentialsSummary: buildHoliduCredentialSummary(credentials),
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

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    const integrationAccountId = existing?.id || randomUUID();
    const credentialsRef =
      existing?.credentialsRef ||
      this.credentialStore.buildSecretName({
        userId,
        integrationAccountId,
      });

    const exchanged = await this.exchangeWhatsAppCode({
      code,
      redirectUri: callbackUrl,
    });

    const selectableNumbers = await this.fetchWhatsAppSelectableNumbers(exchanged.accessToken);
    const issuedAt = nowMs();
    const expiresAt =
      Number.isFinite(exchanged.expiresIn) && exchanged.expiresIn > 0 ? issuedAt + exchanged.expiresIn * 1000 : null;

    await this.credentialStore.ensureSecret({
      userId,
      integrationAccountId,
      payload: {
        provider: "META_WHATSAPP",
        accessToken: exchanged.accessToken,
        tokenType: exchanged.tokenType,
        issuedAt,
        expiresAt,
        tokenMetadataSource: "META_CODE_EXCHANGE",
        selectedPhoneNumberId: null,
        selectedBusinessAccountId: null,
        selectableNumbers,
        lastAssetSyncAt: issuedAt,
      },
    });

    await this.credentialStore.savePendingConnectState(connectSessionId, {
      userId,
      integrationAccountId,
      credentialsRef,
      issuedAt,
      expiresAt,
      selectableNumbers,
    });

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connectSessionId,
      codeReceived: true,
      selectableNumbers,
      credentialsRef,
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
    const pendingConnect = await this.credentialStore.readPendingConnectState(connectSessionId);
    if (!pendingConnect || requireStr(pendingConnect.userId) !== userId) {
      return bad(409, {
        error: "WhatsApp connect session was not found or does not belong to this user.",
      });
    }

    const integrationAccountId = requireStr(pendingConnect.integrationAccountId) || existing?.id || null;
    const credentialsRef = requireStr(pendingConnect.credentialsRef) || existing?.credentialsRef || null;

    if (!integrationAccountId || !credentialsRef) {
      return bad(409, {
        error: "WhatsApp connect session is incomplete. Missing pending integration credentials.",
      });
    }

    const existingSecret = await this.credentialStore.readSecretOrNull(credentialsRef);
    const accessToken = requireStr(existingSecret?.accessToken);
    if (!accessToken) {
      return bad(409, {
        error: "WhatsApp token exchange has not completed successfully. Missing access token in stored credentials.",
      });
    }

    const selectableNumbers = Array.isArray(existingSecret?.selectableNumbers) ? existingSecret.selectableNumbers : [];
    const selectedNumber = selectableNumbers.find((item) => requireStr(item?.phoneNumberId) === phoneNumberId);
    if (!selectedNumber) {
      return bad(400, {
        error: "Selected WhatsApp phone number is not available in the stored Meta assets.",
      });
    }

    await this.credentialStore.writeSecret(credentialsRef, {
      ...existingSecret,
      provider: "META_WHATSAPP",
      accessToken,
      selectedPhoneNumberId: selectedNumber.phoneNumberId,
      selectedBusinessAccountId: selectedNumber.businessAccountId || null,
      selectedBusinessId: selectedNumber.businessId || null,
      selectedDisplayName: displayName || selectedNumber.displayName || null,
      refreshStatus: null,
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

    await this.credentialStore.deletePendingConnectState(connectSessionId);

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

    const secret = await this.credentialStore.readSecretOrNull(existing.credentialsRef);
    const evaluation = this.evaluateWhatsAppTokenState(existing, secret);

    this.logTokenLifecycle(
      evaluation.status === "RECONNECT_REQUIRED" ? "warn" : "log",
      "WhatsApp token health evaluation",
      existing,
      evaluation.cause,
      {
        status: evaluation.status,
        tokenSource: evaluation.tokenSource,
        reliableExpiry: evaluation.reliableExpiry,
      }
    );

    if (evaluation.shouldPersistReconnect) {
      await this.persistReconnectRequired(existing, evaluation.cause, evaluation.message);
    }

    return ok({
      status: evaluation.status,
      expiresAt: evaluation.expiresAt,
      needsReconnect: evaluation.needsReconnect,
      message: evaluation.message,
      tokenSource: evaluation.tokenSource,
      reliableExpiry: evaluation.reliableExpiry,
    });
  }

  async refreshWhatsAppToken(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });

    const secret = await this.credentialStore.readSecretOrNull(existing.credentialsRef);
    const evaluation = this.evaluateWhatsAppTokenState(existing, secret);

    this.logTokenLifecycle("warn", "WhatsApp token refresh unsupported", existing, "refresh_unsupported", {
      tokenSource: evaluation.tokenSource,
      currentStatus: evaluation.status,
    });

    const message = "Automatic WhatsApp token refresh is not supported by the current backend configuration.";

    if (evaluation.shouldPersistReconnect) {
      await this.persistReconnectRequired(
        existing,
        "refresh_unsupported",
        `${message} Reconnect required.`,
        "WHATSAPP_REFRESH_UNSUPPORTED"
      );
    }

    return ok({
      refreshed: false,
      needsReconnect: evaluation.needsReconnect,
      status: evaluation.status,
      expiresAt: evaluation.expiresAt,
      tokenSource: evaluation.tokenSource,
      message: evaluation.needsReconnect ? `${message} Reconnect required.` : message,
    });
  }
}
