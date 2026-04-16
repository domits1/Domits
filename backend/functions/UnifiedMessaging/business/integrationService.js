import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationRoomTypeRepository from "../data/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import ReservationLinkRepository from "../data/reservationLinkRepository.js";

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";
import HoliduCredentialStore from "./holiduCredentialStore.js";
import HoliduProviderClient from "./holiduProviderClient.js";
import ChannexCredentialStore from "./channexCredentialStore.js";
import ChannexProviderClient from "./channexProviderClient.js";
import {
  normalizeHoliduCredentials,
  buildHoliduSecretPayload,
  buildHoliduCredentialSummary,
  hasHoliduRequiredCredentialFields,
  summarizeHoliduRequiredFields,
  normalizeHoliduProviderValidation,
} from "./holiduCredentialUtils.js";
import {
  normalizeChannexCredentials,
  buildChannexCredentialSummary,
  hasChannexRequiredCredentialFields,
  summarizeChannexRequiredFields,
  normalizeChannexProviderValidation,
  buildDefaultChannexProviderValidation,
} from "./channexCredentialUtils.js";

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
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
});
const HOLIDU_ACCOUNT_POLICY = "SINGLE_ACCOUNT_PER_USER";
const HOLIDU_STATUS = {
  NOT_CONNECTED: "NOT_CONNECTED",
  PENDING_PROVIDER_VALIDATION: "PENDING_PROVIDER_VALIDATION",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  DISCONNECTED: "DISCONNECTED",
  CONNECTED: "CONNECTED",
};
const CHANNEX_ACCOUNT_POLICY = "SINGLE_ACCOUNT_PER_USER";
const CHANNEX_STATUS = {
  NOT_CONNECTED: "NOT_CONNECTED",
  PENDING_PROVIDER_VALIDATION: "PENDING_PROVIDER_VALIDATION",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  DISCONNECTED: "DISCONNECTED",
  CONNECTED: "CONNECTED",
};
const shapeCredentialIntegrationForResponse = (integration) => {
  const channel = String(integration?.channel || "").toUpperCase();
  if (!integration || (channel !== "HOLIDU" && channel !== "CHANNEX")) {
    return integration;
  }

  const { credentialsRef, ...safeIntegration } = integration;
  return safeIntegration;
};
const buildHoliduProviderValidationRecord = (validationResult, attemptedAt) => {
  if (validationResult?.success) {
    return normalizeHoliduProviderValidation({
      validationState: HOLIDU_STATUS.CONNECTED,
      providerStatus: validationResult.providerStatus || "VALIDATED",
      validationMethod: "PROVIDER_VALIDATION",
      attemptedAt,
      validatedAt: attemptedAt,
      externalAccountId: validationResult.externalAccountId ?? null,
      errorCode: null,
      errorMessage: null,
    });
  }

  if (validationResult?.canValidate === false) {
    return normalizeHoliduProviderValidation({
      validationState: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
      providerStatus: validationResult.providerStatus || "UNSUPPORTED_IN_REPO_DOCS",
      validationMethod: "PROVIDER_VALIDATION_UNAVAILABLE",
      attemptedAt,
      validatedAt: null,
      externalAccountId: null,
      errorCode: null,
      errorMessage: validationResult.errorMessage ?? null,
    });
  }

  return normalizeHoliduProviderValidation({
    validationState: HOLIDU_STATUS.VALIDATION_FAILED,
    providerStatus: validationResult?.providerStatus || "VALIDATION_FAILED",
    validationMethod: "PROVIDER_VALIDATION",
    attemptedAt,
    validatedAt: null,
    externalAccountId: null,
    errorCode: validationResult?.errorCode || "HOLIDU_PROVIDER_VALIDATION_FAILED",
    errorMessage: validationResult?.errorMessage || "Holidu provider validation failed.",
  });
};
const deriveHoliduPersistedState = (validationResult) => {
  if (validationResult?.success) {
    return {
      status: HOLIDU_STATUS.CONNECTED,
      externalAccountId: validationResult.externalAccountId ?? null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  if (validationResult?.canValidate === false) {
    return {
      status: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
      externalAccountId: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  return {
    status: HOLIDU_STATUS.VALIDATION_FAILED,
    externalAccountId: null,
    lastErrorCode: validationResult?.errorCode || "HOLIDU_PROVIDER_VALIDATION_FAILED",
    lastErrorMessage: validationResult?.errorMessage || "Holidu provider validation failed.",
  };
};
const buildChannexProviderValidationRecord = (validationResult, attemptedAt) => {
  if (validationResult?.success) {
    return normalizeChannexProviderValidation({
      validationState: CHANNEX_STATUS.CONNECTED,
      providerStatus: validationResult.providerStatus || "ACTIVE",
      validationMethod: "PROVIDER_VALIDATION",
      attemptedAt,
      validatedAt: attemptedAt,
      externalAccountId: validationResult.externalAccountId ?? null,
      errorCode: null,
      errorMessage: null,
    });
  }

  return normalizeChannexProviderValidation({
    validationState: CHANNEX_STATUS.VALIDATION_FAILED,
    providerStatus: validationResult?.providerStatus || "VALIDATION_FAILED",
    validationMethod: "PROVIDER_VALIDATION",
    attemptedAt,
    validatedAt: null,
    externalAccountId: null,
    errorCode: validationResult?.errorCode || "CHANNEX_PROVIDER_VALIDATION_FAILED",
    errorMessage: validationResult?.errorMessage || "Channex provider validation failed.",
  });
};
const deriveChannexPersistedState = (validationResult) => {
  if (validationResult?.success) {
    return {
      status: CHANNEX_STATUS.CONNECTED,
      externalAccountId: validationResult.externalAccountId ?? null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  return {
    status: CHANNEX_STATUS.VALIDATION_FAILED,
    externalAccountId: null,
    lastErrorCode: validationResult?.errorCode || "CHANNEX_PROVIDER_VALIDATION_FAILED",
    lastErrorMessage: validationResult?.errorMessage || "Channex provider validation failed.",
  };
};

export default class IntegrationService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    roomTypes = new IntegrationRoomTypeRepository(),
    sync = new IntegrationSyncRepository(),
    resLinks = new ReservationLinkRepository(),
    runner = new SyncRunner(),
    credentialStore = new WhatsAppCredentialStore(),
    holiduCredentialStore = new HoliduCredentialStore(),
    holiduProviderClient = new HoliduProviderClient(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
  } = {}) {
    this.accounts = accounts;
    this.props = props;
    this.roomTypes = roomTypes;
    this.sync = sync;
    this.resLinks = resLinks;
    this.runner = runner;
    this.credentialStore = credentialStore;
    this.holiduCredentialStore = holiduCredentialStore;
    this.holiduProviderClient = holiduProviderClient;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
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
      return shapeCredentialIntegrationForResponse(item);
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
    const credentials = normalizeHoliduCredentials(body.credentials);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!credentials || !hasHoliduRequiredCredentialFields(credentials)) {
      return bad(400, {
        error: "Holidu credentials must include apiKey, or both clientId and clientSecret.",
      });
    }

    try {
      // Multi-account support for Holidu is intentionally deferred for now.
      // Reuse the user's existing HOLIDU integration row instead of creating additional accounts.
      const existing = await this.accounts.findByUserIdAndChannel(userId, "HOLIDU");
      const integrationAccountId = existing?.id || randomUUID();
      const connectedAt = existing?.createdAt || nowMs();
      const updatedAt = nowMs();
      const secretPayload = buildHoliduSecretPayload({
        credentials,
        connectedAt,
        updatedAt,
      });

      let credentialsRef;
      try {
        credentialsRef = await this.holiduCredentialStore.ensureSecret({
          userId,
          integrationAccountId,
          payload: secretPayload,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: "Failed to store Holidu credentials in Secrets Manager.",
          errorCode: "HOLIDU_SECRET_STORE_FAILED",
          details,
        });
      }

      const validationAttemptedAt = nowMs();
      const validationResult = await this.holiduProviderClient.validateAccount(credentials);
      const providerValidation = buildHoliduProviderValidationRecord(validationResult, validationAttemptedAt);
      const persistedState = deriveHoliduPersistedState(validationResult);

      try {
        await this.holiduCredentialStore.writeSecret(credentialsRef, {
          ...secretPayload,
          updatedAt: validationAttemptedAt,
          providerValidation,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: "Holidu credentials were stored, but provider validation metadata could not be persisted.",
          errorCode: "HOLIDU_SECRET_UPDATE_FAILED",
          details,
        });
      }

      let integration;
      try {
        if (existing) {
          integration = await this.accounts.update(existing.id, {
            displayName,
            externalAccountId: persistedState.externalAccountId,
            status: persistedState.status,
            credentialsRef,
            lastErrorCode: persistedState.lastErrorCode,
            lastErrorMessage: persistedState.lastErrorMessage,
          });
        } else {
          integration = await this.accounts.create({
            id: integrationAccountId,
            userId,
            channel: "HOLIDU",
            externalAccountId: persistedState.externalAccountId,
            displayName,
            status: persistedState.status,
            credentialsRef,
            lastSuccessfulSyncAt: null,
            lastFailedSyncAt: null,
            lastErrorCode: persistedState.lastErrorCode,
            lastErrorMessage: persistedState.lastErrorMessage,
            createdAt: connectedAt,
            updatedAt,
          });

          await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
          await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
        }
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: "Holidu credentials were stored, but the integration record could not be persisted.",
          errorCode: "HOLIDU_CONNECTION_PERSIST_FAILED",
          details,
        });
      }

      return ok({
        connected: persistedState.status === HOLIDU_STATUS.CONNECTED,
        channel: "HOLIDU",
        integration: shapeCredentialIntegrationForResponse(integration),
        credentialsSummary: buildHoliduCredentialSummary(credentials),
        validationMode:
          validationResult?.canValidate === false ? "PROVIDER_VALIDATION_UNAVAILABLE" : "PROVIDER_VALIDATION",
        validationState: persistedState.status,
        providerStatus: providerValidation.providerStatus,
        accountPolicy: HOLIDU_ACCOUNT_POLICY,
        multiAccountDeferred: true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Unexpected Holidu connection failure.",
        errorCode: "HOLIDU_CONNECT_FAILED",
        details,
      });
    }
  }

  async checkHoliduStatus(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "HOLIDU");
      if (!integration) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: null,
          status: HOLIDU_STATUS.NOT_CONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: HOLIDU_STATUS.NOT_CONNECTED,
          reason: "No Holidu integration row exists for this user.",
          displayName: null,
          externalAccountId: null,
          credentialsRefPresent: false,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      if (String(integration.status || "").toUpperCase() === "DISCONNECTED") {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.DISCONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: HOLIDU_STATUS.DISCONNECTED,
          reason: "Holidu integration is disconnected in Domits and is not locally usable.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent: false,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      const credentialsRefPresent = !!requireStr(integration.credentialsRef);
      if (!credentialsRefPresent) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: HOLIDU_STATUS.RECONNECT_REQUIRED,
          reason: "Integration row exists but credentialsRef is missing.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      let secret;
      try {
        secret = await this.holiduCredentialStore.readSecretOrNull(integration.credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: HOLIDU_STATUS.RECONNECT_REQUIRED,
          reason: `Stored Holidu secret could not be read locally: ${details.message}`,
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      if (!secret || typeof secret !== "object" || Array.isArray(secret)) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: HOLIDU_STATUS.RECONNECT_REQUIRED,
          reason: "Stored Holidu secret is missing, unreadable, or malformed.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      const requiredFieldSummary = summarizeHoliduRequiredFields(secret);
      if (!hasHoliduRequiredCredentialFields(secret)) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: HOLIDU_STATUS.RECONNECT_REQUIRED,
          reason: "Stored Holidu secret is present but required local credential fields are incomplete.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      const providerValidation = normalizeHoliduProviderValidation(secret.providerValidation);
      const normalizedStatus = String(integration.status || "").toUpperCase();
      if (
        normalizedStatus === HOLIDU_STATUS.CONNECTED &&
        providerValidation.validationState === HOLIDU_STATUS.CONNECTED
      ) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.CONNECTED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: HOLIDU_STATUS.CONNECTED,
          reason: "Stored Holidu credentials are locally valid and provider validation has explicitly succeeded.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? providerValidation.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      if (normalizedStatus === HOLIDU_STATUS.VALIDATION_FAILED) {
        return ok({
          channel: "HOLIDU",
          integrationAccountId: integration.id,
          status: HOLIDU_STATUS.VALIDATION_FAILED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: HOLIDU_STATUS.VALIDATION_FAILED,
          reason: integration.lastErrorMessage || providerValidation.errorMessage || "Provider validation failed.",
          displayName: integration.displayName ?? null,
          externalAccountId: null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      return ok({
        channel: "HOLIDU",
        integrationAccountId: integration.id,
        status: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
        validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
        validationState: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
        reason:
          providerValidation.errorMessage ||
          "Stored Holidu credentials are locally valid, but provider validation has not explicitly succeeded.",
        displayName: integration.displayName ?? null,
        externalAccountId: null,
        credentialsRefPresent,
        secretPresent: true,
        requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to evaluate Holidu local connectivity state.",
        errorCode: "HOLIDU_STATUS_CHECK_FAILED",
        details,
      });
    }
  }

  async disconnectHolidu(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });
    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, "HOLIDU");
      if (!existing) return bad(404, { error: "Holidu integration not found" });

      let disconnected;
      try {
        disconnected = await this.accounts.disconnect(existing.id);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: "Failed to persist Holidu disconnect state in Domits.",
          errorCode: "HOLIDU_DISCONNECT_PERSIST_FAILED",
          details,
        });
      }

      if (!disconnected) return bad(404, { error: "Holidu integration not found" });

      return ok({
        disconnected: true,
        channel: "HOLIDU",
        integrationAccountId: disconnected.id,
        status: disconnected.status,
        message:
          "Holidu integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Unexpected Holidu disconnect failure.",
        errorCode: "HOLIDU_DISCONNECT_FAILED",
        details,
      });
    }
  }

  async connectChannex(body) {
    const userId = requireStr(body.userId);
    const displayName = requireStr(body.displayName) || "Channex";
    const credentials = normalizeChannexCredentials(body.credentials);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!credentials || !hasChannexRequiredCredentialFields(credentials)) {
      return bad(400, {
        error: "Channex credentials must include apiKey.",
      });
    }

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
      const integrationAccountId = existing?.id || randomUUID();
      const connectedAt = existing?.createdAt || nowMs();
      const updatedAt = nowMs();
      const secretPayload = {
        provider: "CHANNEX",
        credentialType: "MANUAL_CONNECT",
        ...credentials,
        connectedAt,
        updatedAt,
        providerValidation: buildDefaultChannexProviderValidation(),
      };

      let credentialsRef;
      try {
        credentialsRef = await this.channexCredentialStore.ensureSecret({
          userId,
          integrationAccountId,
          payload: secretPayload,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: "Failed to store Channex credentials in Secrets Manager.",
          errorCode: "CHANNEX_SECRET_STORE_FAILED",
          details,
        });
      }

      const validationAttemptedAt = nowMs();
      const validationResult = await this.channexProviderClient.validateApiKey(credentials);
      const providerValidation = buildChannexProviderValidationRecord(validationResult, validationAttemptedAt);
      const persistedState = deriveChannexPersistedState(validationResult);

      try {
        await this.channexCredentialStore.writeSecret(credentialsRef, {
          ...secretPayload,
          updatedAt: validationAttemptedAt,
          providerValidation,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: "Channex credentials were stored, but provider validation metadata could not be persisted.",
          errorCode: "CHANNEX_SECRET_UPDATE_FAILED",
          details,
        });
      }

      let integration;
      try {
        if (existing) {
          integration = await this.accounts.update(existing.id, {
            displayName,
            externalAccountId: persistedState.externalAccountId,
            status: persistedState.status,
            credentialsRef,
            lastErrorCode: persistedState.lastErrorCode,
            lastErrorMessage: persistedState.lastErrorMessage,
          });
        } else {
          integration = await this.accounts.create({
            id: integrationAccountId,
            userId,
            channel: "CHANNEX",
            externalAccountId: persistedState.externalAccountId,
            displayName,
            status: persistedState.status,
            credentialsRef,
            lastSuccessfulSyncAt: null,
            lastFailedSyncAt: null,
            lastErrorCode: persistedState.lastErrorCode,
            lastErrorMessage: persistedState.lastErrorMessage,
            createdAt: connectedAt,
            updatedAt,
          });

          await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
          await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
        }
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: "Channex credentials were stored, but the integration record could not be persisted.",
          errorCode: "CHANNEX_CONNECTION_PERSIST_FAILED",
          details,
        });
      }

      return ok({
        connected: persistedState.status === CHANNEX_STATUS.CONNECTED,
        channel: "CHANNEX",
        integration: shapeCredentialIntegrationForResponse(integration),
        credentialsSummary: buildChannexCredentialSummary(credentials),
        validationMode: "PROVIDER_VALIDATION",
        validationState: persistedState.status,
        providerStatus: providerValidation.providerStatus,
        accountPolicy: CHANNEX_ACCOUNT_POLICY,
        multiAccountDeferred: true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Unexpected Channex connection failure.",
        errorCode: "CHANNEX_CONNECT_FAILED",
        details,
      });
    }
  }

  async checkChannexStatus(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: null,
          status: CHANNEX_STATUS.NOT_CONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: CHANNEX_STATUS.NOT_CONNECTED,
          reason: "No Channex integration row exists for this user.",
          displayName: null,
          externalAccountId: null,
          credentialsRefPresent: false,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      if (String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.DISCONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: CHANNEX_STATUS.DISCONNECTED,
          reason: "Channex integration is disconnected in Domits and is not locally usable.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent: false,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      const credentialsRefPresent = !!requireStr(integration.credentialsRef);
      if (!credentialsRefPresent) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: CHANNEX_STATUS.RECONNECT_REQUIRED,
          reason: "Integration row exists but credentialsRef is missing.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      let secret;
      try {
        secret = await this.channexCredentialStore.readSecretOrNull(integration.credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: CHANNEX_STATUS.RECONNECT_REQUIRED,
          reason: `Stored Channex secret could not be read locally: ${details.message}`,
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      if (!secret || typeof secret !== "object" || Array.isArray(secret)) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: CHANNEX_STATUS.RECONNECT_REQUIRED,
          reason: "Stored Channex secret is missing, unreadable, or malformed.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: false,
          requiredFieldsPresent: false,
        });
      }

      const requiredFieldSummary = summarizeChannexRequiredFields(secret);
      if (!hasChannexRequiredCredentialFields(secret)) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: CHANNEX_STATUS.RECONNECT_REQUIRED,
          reason: "Stored Channex secret is present but required local credential fields are incomplete.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      const providerValidation = normalizeChannexProviderValidation(secret.providerValidation);
      const normalizedStatus = String(integration.status || "").toUpperCase();
      if (
        normalizedStatus === CHANNEX_STATUS.CONNECTED &&
        providerValidation.validationState === CHANNEX_STATUS.CONNECTED
      ) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.CONNECTED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: CHANNEX_STATUS.CONNECTED,
          reason: "Stored Channex credentials are locally valid and provider validation has explicitly succeeded.",
          displayName: integration.displayName ?? null,
          externalAccountId: integration.externalAccountId ?? providerValidation.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      if (normalizedStatus === CHANNEX_STATUS.VALIDATION_FAILED) {
        return ok({
          channel: "CHANNEX",
          integrationAccountId: integration.id,
          status: CHANNEX_STATUS.VALIDATION_FAILED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: CHANNEX_STATUS.VALIDATION_FAILED,
          reason: integration.lastErrorMessage || providerValidation.errorMessage || "Provider validation failed.",
          displayName: integration.displayName ?? null,
          externalAccountId: null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: CHANNEX_STATUS.PENDING_PROVIDER_VALIDATION,
        validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
        validationState: CHANNEX_STATUS.PENDING_PROVIDER_VALIDATION,
        reason:
          providerValidation.errorMessage ||
          "Stored Channex credentials are locally valid, but provider validation has not explicitly succeeded.",
        displayName: integration.displayName ?? null,
        externalAccountId: null,
        credentialsRefPresent,
        secretPresent: true,
        requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to evaluate Channex local connectivity state.",
        errorCode: "CHANNEX_STATUS_CHECK_FAILED",
        details,
      });
    }
  }

  async disconnectChannex(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
      if (!existing) return bad(404, { error: "Channex integration not found" });

      let disconnected;
      try {
        disconnected = await this.accounts.disconnect(existing.id);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: "Failed to persist Channex disconnect state in Domits.",
          errorCode: "CHANNEX_DISCONNECT_PERSIST_FAILED",
          details,
        });
      }

      if (!disconnected) return bad(404, { error: "Channex integration not found" });

      return ok({
        disconnected: true,
        channel: "CHANNEX",
        integrationAccountId: disconnected.id,
        status: disconnected.status,
        message:
          "Channex integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Unexpected Channex disconnect failure.",
        errorCode: "CHANNEX_DISCONNECT_FAILED",
        details,
      });
    }
  }

  async listChannexProperties(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
        return bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: !integration ? CHANNEX_STATUS.NOT_CONNECTED : CHANNEX_STATUS.DISCONNECTED,
        });
      }

      const credentialsRef = requireStr(integration.credentialsRef);
      if (!credentialsRef) {
        return bad(409, {
          error: "Channex credentials are missing. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      let secret;
      try {
        secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        });
      }

      if (
        !secret ||
        typeof secret !== "object" ||
        Array.isArray(secret) ||
        !hasChannexRequiredCredentialFields(secret)
      ) {
        return bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const propertyListResult = await this.channexProviderClient.listProperties(secret);
      if (!propertyListResult?.success) {
        return bad(502, {
          error: propertyListResult?.errorMessage || "Failed to fetch Channex properties.",
          errorCode: propertyListResult?.errorCode || "CHANNEX_PROPERTY_LIST_FAILED",
          status:
            propertyListResult?.providerStatus === "UNAUTHORIZED"
              ? CHANNEX_STATUS.RECONNECT_REQUIRED
              : CHANNEX_STATUS.VALIDATION_FAILED,
          providerStatus: propertyListResult?.providerStatus || "PROPERTY_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: CHANNEX_STATUS.CONNECTED,
        properties: (Array.isArray(propertyListResult.properties) ? propertyListResult.properties : []).map(
          (property) => ({
            externalPropertyId: property.externalPropertyId,
            externalPropertyName: property.externalPropertyName,
            propertyStatus: property.propertyStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex properties.",
        errorCode: "CHANNEX_PROPERTY_LIST_SERVICE_FAILED",
        details,
      });
    }
  }

  async listChannexRoomTypes(userId, externalPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedExternalPropertyId = requireStr(externalPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedExternalPropertyId) {
      return bad(400, {
        error: "Missing required query param: externalPropertyId",
      });
    }

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
        return bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: !integration ? CHANNEX_STATUS.NOT_CONNECTED : CHANNEX_STATUS.DISCONNECTED,
        });
      }

      const credentialsRef = requireStr(integration.credentialsRef);
      if (!credentialsRef) {
        return bad(409, {
          error: "Channex credentials are missing. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      let secret;
      try {
        secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        });
      }

      if (
        !secret ||
        typeof secret !== "object" ||
        Array.isArray(secret) ||
        !hasChannexRequiredCredentialFields(secret)
      ) {
        return bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const roomTypeListResult = await this.channexProviderClient.listRoomTypes(secret, normalizedExternalPropertyId);
      if (!roomTypeListResult?.success) {
        return bad(502, {
          error: roomTypeListResult?.errorMessage || "Failed to fetch Channex room types.",
          errorCode: roomTypeListResult?.errorCode || "CHANNEX_ROOM_TYPE_LIST_FAILED",
          status:
            roomTypeListResult?.providerStatus === "UNAUTHORIZED"
              ? CHANNEX_STATUS.RECONNECT_REQUIRED
              : CHANNEX_STATUS.VALIDATION_FAILED,
          providerStatus: roomTypeListResult?.providerStatus || "ROOM_TYPE_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        externalPropertyId: normalizedExternalPropertyId,
        status: CHANNEX_STATUS.CONNECTED,
        roomTypes: (Array.isArray(roomTypeListResult.roomTypes) ? roomTypeListResult.roomTypes : []).map(
          (roomType) => ({
            externalRoomTypeId: roomType.externalRoomTypeId,
            externalRoomTypeName: roomType.externalRoomTypeName,
            roomTypeStatus: roomType.roomTypeStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex room types.",
        errorCode: "CHANNEX_ROOM_TYPE_LIST_SERVICE_FAILED",
        details,
      });
    }
  }

  async linkChannexProperty(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalPropertyName = requireStr(body?.externalPropertyName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
        return bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: !integration ? CHANNEX_STATUS.NOT_CONNECTED : CHANNEX_STATUS.DISCONNECTED,
        });
      }

      if (!requireStr(integration.credentialsRef)) {
        return bad(409, {
          error: "Channex integration is not locally usable. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const saved = await this.upsertIntegrationProperty(integration.id, {
        domitsPropertyId,
        externalPropertyId,
        externalPropertyName,
        status: "ACTIVE",
      });

      if (saved?.statusCode !== 200) {
        return saved;
      }

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.response?.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.response?.externalPropertyId ?? externalPropertyId,
        externalPropertyName: saved.response?.externalPropertyName ?? externalPropertyName ?? null,
        status: saved.response?.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex property mapping.",
        errorCode: "CHANNEX_PROPERTY_LINK_FAILED",
        details,
      });
    }
  }

  async linkChannexRoomType(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRoomTypeName = requireStr(body?.externalRoomTypeName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
        return bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: !integration ? CHANNEX_STATUS.NOT_CONNECTED : CHANNEX_STATUS.DISCONNECTED,
        });
      }

      if (!requireStr(integration.credentialsRef)) {
        return bad(409, {
          error: "Channex integration is not locally usable. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const saved = await this.roomTypes.upsert({
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        externalRoomTypeId,
        externalRoomTypeName,
        status: "ACTIVE",
      });

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.externalPropertyId ?? externalPropertyId,
        externalRoomTypeId: saved.externalRoomTypeId ?? externalRoomTypeId,
        externalRoomTypeName: saved.externalRoomTypeName ?? externalRoomTypeName ?? null,
        status: saved.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex room type mapping.",
        errorCode: "CHANNEX_ROOM_TYPE_LINK_FAILED",
        details,
      });
    }
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
