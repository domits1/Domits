import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../data/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../data/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import ReservationLinkRepository from "../data/reservationLinkRepository.js";
import Database from "../ORM/index.js";

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
const quoteIdentifier = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
const resolveDatabaseSchemaName = (client) => {
  if (process.env.TEST === "true") return "test";

  const schema = requireStr(client?.options?.schema);
  if (!schema) return "main";

  return schema.toLowerCase() === "public" ? "main" : schema.trim().toLowerCase();
};
const qualifyTableName = (client, tableName) =>
  `${quoteIdentifier(resolveDatabaseSchemaName(client))}.${quoteIdentifier(tableName)}`;
const toIntegerOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};
const parseIsoDateParam = (value) => {
  const normalized = requireStr(value);
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
};
const isoDateToCalendarInt = (value) => {
  const normalized = parseIsoDateParam(value);
  return normalized ? Number(normalized.replaceAll("-", "")) : null;
};
const calendarIntToIsoDate = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const truncatedValue = Math.trunc(numericValue);
  if (truncatedValue < 10000101 || truncatedValue > 99991231) return null;

  const stringValue = String(truncatedValue);
  return `${stringValue.slice(0, 4)}-${stringValue.slice(4, 6)}-${stringValue.slice(6, 8)}`;
};
const normalizeValueToCalendarInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const normalizedIso = parseIsoDateParam(value);
    if (normalizedIso) return Number(normalizedIso.replaceAll("-", ""));

    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  const truncatedValue = Math.trunc(numericValue);
  if (truncatedValue >= 10000101 && truncatedValue <= 99991231) {
    return truncatedValue;
  }

  const milliseconds = truncatedValue > 1000000000000 ? truncatedValue : truncatedValue * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return null;

  return Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(
      2,
      "0"
    )}`
  );
};
const buildCalendarDateRange = (startIsoDate, endIsoDate) => {
  const out = [];
  const start = parseIsoDateParam(startIsoDate);
  const end = parseIsoDateParam(endIsoDate);
  if (!start || !end) return out;

  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  while (cursor.getTime() <= endDate.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
};
const isWeekendIsoDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return day === 5 || day === 6;
};
const getPropertyAvailabilityWindows = async (propertyId) => {
  const client = await Database.getInstance();
  const rows = await client.query(
    `
      SELECT property_id, availablestartdate, availableenddate
      FROM ${qualifyTableName(client, "property_availability")}
      WHERE property_id = $1
      ORDER BY availablestartdate ASC
    `,
    [propertyId]
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    propertyId: String(row?.property_id || ""),
    availableStartDate: row?.availablestartdate,
    availableEndDate: row?.availableenddate,
  }));
};
const getPropertyCalendarOverrides = async (propertyId, startDate, endDate) => {
  const client = await Database.getInstance();
  const tableName = qualifyTableName(client, "property_calendar_override");
  const params = [propertyId];
  const where = ["property_id = $1"];

  if (startDate) {
    params.push(startDate);
    where.push(`calendar_date >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    where.push(`calendar_date <= $${params.length}`);
  }

  const rows = await client.query(
    `
      SELECT property_id, calendar_date, is_available, nightly_price, updated_at
      FROM ${tableName}
      WHERE ${where.join(" AND ")}
      ORDER BY calendar_date ASC
    `,
    params
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    propertyId: String(row?.property_id || ""),
    date: toIntegerOrNull(row?.calendar_date),
    isAvailable: row?.is_available === null || row?.is_available === undefined ? null : Boolean(row.is_available),
    nightlyPrice: toIntegerOrNull(row?.nightly_price),
    updatedAt: toIntegerOrNull(row?.updated_at),
  }));
};
const getPropertyPricing = async (propertyId) => {
  const client = await Database.getInstance();
  const schemaName = resolveDatabaseSchemaName(client);
  const weekendRateColumnResult = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
        AND table_schema = $2
        AND lower(column_name) = 'weekendrate'
      LIMIT 1
    `,
    ["property_pricing", schemaName]
  );
  const hasWeekendRateColumn = Array.isArray(weekendRateColumnResult) && weekendRateColumnResult.length > 0;

  const rows = await client.query(
    `
      SELECT
        property_id,
        roomrate,
        cleaning,
        ${hasWeekendRateColumn ? "weekendrate" : "roomrate AS weekendrate"}
      FROM ${qualifyTableName(client, "property_pricing")}
      WHERE property_id = $1
      LIMIT 1
    `,
    [propertyId]
  );

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return null;

  return {
    propertyId: String(row?.property_id || ""),
    roomRate: toIntegerOrNull(row?.roomrate),
    cleaning: row?.cleaning === null || row?.cleaning === undefined ? null : toIntegerOrNull(row?.cleaning),
    weekendRate: toIntegerOrNull(row?.weekendrate ?? row?.roomrate),
  };
};
const getPropertyAvailabilityRestrictions = async (propertyId) => {
  const client = await Database.getInstance();
  const rows = await client.query(
    `
      SELECT id, property_id, restriction, value
      FROM ${qualifyTableName(client, "property_availabilityrestriction")}
      WHERE property_id = $1
      ORDER BY restriction ASC
    `,
    [propertyId]
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: String(row?.id || ""),
    propertyId: String(row?.property_id || ""),
    restriction: requireStr(row?.restriction),
    value: Number.isFinite(Number(row?.value)) ? Number(row.value) : null,
  }));
};
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
    ratePlans = new IntegrationRatePlanRepository(),
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
    this.ratePlans = ratePlans;
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

  async listChannexRatePlans(userId, externalRoomTypeId) {
    const normalizedUserId = requireStr(userId);
    const normalizedExternalRoomTypeId = requireStr(externalRoomTypeId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedExternalRoomTypeId) {
      return bad(400, {
        error: "Missing required query param: externalRoomTypeId",
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

      const ratePlanListResult = await this.channexProviderClient.listRatePlans(secret, normalizedExternalRoomTypeId);
      if (!ratePlanListResult?.success) {
        return bad(502, {
          error: ratePlanListResult?.errorMessage || "Failed to fetch Channex rate plans.",
          errorCode: ratePlanListResult?.errorCode || "CHANNEX_RATE_PLAN_LIST_FAILED",
          status:
            ratePlanListResult?.providerStatus === "UNAUTHORIZED"
              ? CHANNEX_STATUS.RECONNECT_REQUIRED
              : CHANNEX_STATUS.VALIDATION_FAILED,
          providerStatus: ratePlanListResult?.providerStatus || "RATE_PLAN_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        externalRoomTypeId: normalizedExternalRoomTypeId,
        status: CHANNEX_STATUS.CONNECTED,
        ratePlans: (Array.isArray(ratePlanListResult.ratePlans) ? ratePlanListResult.ratePlans : []).map(
          (ratePlan) => ({
            externalRatePlanId: ratePlan.externalRatePlanId,
            externalRatePlanName: ratePlan.externalRatePlanName,
            ratePlanStatus: ratePlan.ratePlanStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex rate plans.",
        errorCode: "CHANNEX_RATE_PLAN_LIST_SERVICE_FAILED",
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

  async linkChannexRatePlan(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRatePlanId = requireStr(body?.externalRatePlanId);
    const externalRatePlanName = requireStr(body?.externalRatePlanName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });
    if (!externalRatePlanId) return bad(400, { error: "Missing required field: externalRatePlanId" });

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

      const saved = await this.ratePlans.upsert({
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        externalRoomTypeId,
        externalRatePlanId,
        externalRatePlanName,
        status: "ACTIVE",
      });

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.externalPropertyId ?? externalPropertyId,
        externalRoomTypeId: saved.externalRoomTypeId ?? externalRoomTypeId,
        externalRatePlanId: saved.externalRatePlanId ?? externalRatePlanId,
        externalRatePlanName: saved.externalRatePlanName ?? externalRatePlanName ?? null,
        status: saved.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex rate plan mapping.",
        errorCode: "CHANNEX_RATE_PLAN_LINK_FAILED",
        details,
      });
    }
  }

  async listLinkedChannexRoomTypes(userId) {
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

      if (!requireStr(integration.credentialsRef)) {
        return bad(409, {
          error: "Channex integration is not locally usable. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const mappings = await this.roomTypes.listByAccountId(integration.id);

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: integration.status,
        roomTypeMappings: (Array.isArray(mappings) ? mappings : []).map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRoomTypeName: mapping.externalRoomTypeName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list linked Channex room type mappings.",
        errorCode: "CHANNEX_ROOM_TYPE_MAPPING_LIST_FAILED",
        details,
      });
    }
  }

  async listLinkedChannexRatePlans(userId) {
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

      if (!requireStr(integration.credentialsRef)) {
        return bad(409, {
          error: "Channex integration is not locally usable. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const mappings = await this.ratePlans.listByAccountId(integration.id);

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: integration.status,
        ratePlanMappings: (Array.isArray(mappings) ? mappings : []).map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: mapping.externalRatePlanId,
          externalRatePlanName: mapping.externalRatePlanName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list linked Channex rate plan mappings.",
        errorCode: "CHANNEX_RATE_PLAN_MAPPING_LIST_FAILED",
        details,
      });
    }
  }

  async getChannexAriTargets(userId, domitsPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
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

      if (!requireStr(integration.credentialsRef)) {
        return bad(409, {
          error: "Channex integration is not locally usable. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        });
      }

      const [propertyMappings, roomTypeMappings, ratePlanMappings] = await Promise.all([
        this.props.listByAccountId(integration.id),
        this.roomTypes.listByAccountId(integration.id),
        this.ratePlans.listByAccountId(integration.id),
      ]);

      const propertyMapping =
        (Array.isArray(propertyMappings) ? propertyMappings : []).find(
          (mapping) => mapping.domitsPropertyId === normalizedDomitsPropertyId
        ) || null;
      const propertyScopedRoomTypeMappings = (Array.isArray(roomTypeMappings) ? roomTypeMappings : []).filter(
        (mapping) => mapping.domitsPropertyId === normalizedDomitsPropertyId
      );
      const propertyScopedRatePlanMappings = (Array.isArray(ratePlanMappings) ? ratePlanMappings : []).filter(
        (mapping) => mapping.domitsPropertyId === normalizedDomitsPropertyId
      );

      const missingMappings = [];
      if (!propertyMapping) missingMappings.push("PROPERTY_MAPPING_MISSING");
      if (!propertyScopedRoomTypeMappings.length) missingMappings.push("ROOM_TYPE_MAPPING_MISSING");
      if (!propertyScopedRatePlanMappings.length) missingMappings.push("RATE_PLAN_MAPPING_MISSING");

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        status: integration.status,
        ready: missingMappings.length === 0,
        missingMappings,
        propertyMapping: propertyMapping
          ? {
              domitsPropertyId: propertyMapping.domitsPropertyId,
              externalPropertyId: propertyMapping.externalPropertyId,
              externalPropertyName: propertyMapping.externalPropertyName ?? null,
              status: propertyMapping.status,
            }
          : null,
        roomTypeMappings: propertyScopedRoomTypeMappings.map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRoomTypeName: mapping.externalRoomTypeName ?? null,
          status: mapping.status,
        })),
        ratePlanMappings: propertyScopedRatePlanMappings.map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: mapping.externalRatePlanId,
          externalRatePlanName: mapping.externalRatePlanName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get Channex ARI targets.",
        errorCode: "CHANNEX_ARI_TARGETS_FAILED",
        details,
      });
    }
  }

  async previewChannexAri(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }
    if (!normalizedDateFrom) {
      return bad(400, { error: "Invalid or missing required query param: dateFrom" });
    }
    if (!normalizedDateTo) {
      return bad(400, { error: "Invalid or missing required query param: dateTo" });
    }
    if (normalizedDateFrom > normalizedDateTo) {
      return bad(400, {
        error: "dateFrom must be less than or equal to dateTo.",
      });
    }

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return readinessResult;
      }

      const readiness = readinessResult.response || {};
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
          availabilityPreview: [],
          rateRestrictionPreview: [],
        });
      }

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [availabilityWindows, calendarOverrides, pricing, restrictions] = await Promise.all([
        getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        getPropertyPricing(normalizedDomitsPropertyId),
        getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
      ]);

      const normalizedAvailabilityWindows = (Array.isArray(availabilityWindows) ? availabilityWindows : [])
        .map((entry) => ({
          availableStartDate: normalizeValueToCalendarInt(entry?.availableStartDate),
          availableEndDate: normalizeValueToCalendarInt(entry?.availableEndDate),
        }))
        .filter((entry) => entry.availableStartDate && entry.availableEndDate);

      const overrideMap = new Map(
        (Array.isArray(calendarOverrides) ? calendarOverrides : [])
          .map((entry) => {
            const isoDate = calendarIntToIsoDate(entry?.date);
            if (!isoDate) return null;

            return [
              isoDate,
              {
                isAvailable: entry?.isAvailable ?? null,
                nightlyPrice: entry?.nightlyPrice ?? null,
                updatedAt: entry?.updatedAt ?? null,
              },
            ];
          })
          .filter(Boolean)
      );

      const normalizedRestrictions = (Array.isArray(restrictions) ? restrictions : [])
        .map((restriction) => ({
          restriction: requireStr(restriction?.restriction),
          value: Number.isFinite(Number(restriction?.value)) ? Number(restriction.value) : null,
        }))
        .filter((restriction) => restriction.restriction && restriction.value !== null);

      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);

      const availabilityPreview = [];
      const rateRestrictionPreview = [];

      for (const isoDate of dates) {
        const calendarDate = isoDateToCalendarInt(isoDate);
        const override = overrideMap.get(isoDate) || null;
        const isAvailableFromWindows = normalizedAvailabilityWindows.some(
          (entry) => calendarDate >= entry.availableStartDate && calendarDate <= entry.availableEndDate
        );
        const effectiveAvailability =
          override?.isAvailable === null || override?.isAvailable === undefined ? isAvailableFromWindows : override.isAvailable;
        const effectiveNightlyPrice =
          override?.nightlyPrice ??
          (pricing ? (isWeekendIsoDate(isoDate) ? pricing.weekendRate : pricing.roomRate) : null);

        for (const roomTypeMapping of Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : []) {
          availabilityPreview.push({
            domitsPropertyId: normalizedDomitsPropertyId,
            externalPropertyId: roomTypeMapping.externalPropertyId,
            externalRoomTypeId: roomTypeMapping.externalRoomTypeId,
            date: isoDate,
            availability: effectiveAvailability,
          });
        }

        for (const ratePlanMapping of Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : []) {
          rateRestrictionPreview.push({
            domitsPropertyId: normalizedDomitsPropertyId,
            externalPropertyId: ratePlanMapping.externalPropertyId,
            externalRoomTypeId: ratePlanMapping.externalRoomTypeId,
            externalRatePlanId: ratePlanMapping.externalRatePlanId,
            date: isoDate,
            nightlyPrice: effectiveNightlyPrice,
            restrictions: normalizedRestrictions.map((restriction) => ({
              restriction: restriction.restriction,
              value: restriction.value,
            })),
          });
        }
      }

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        ready: true,
        missingMappings: [],
        propertyMapping: readiness.propertyMapping || null,
        roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
        sourceSummary: {
          propertyAvailabilityWindows: normalizedAvailabilityWindows.length,
          calendarOverrides: overrideMap.size,
          hasBasePricing: !!pricing,
          availabilityRestrictions: normalizedRestrictions.length,
        },
        availabilityPreview,
        rateRestrictionPreview,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex ARI preview.",
        errorCode: "CHANNEX_ARI_PREVIEW_FAILED",
        details,
      });
    }
  }

  async previewChannexAriPayloads(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }
    if (!normalizedDateFrom) {
      return bad(400, { error: "Invalid or missing required query param: dateFrom" });
    }
    if (!normalizedDateTo) {
      return bad(400, { error: "Invalid or missing required query param: dateTo" });
    }
    if (normalizedDateFrom > normalizedDateTo) {
      return bad(400, {
        error: "dateFrom must be less than or equal to dateTo.",
      });
    }

    try {
      const previewResult = await this.previewChannexAri(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
      if (previewResult?.statusCode !== 200) {
        return previewResult;
      }

      const preview = previewResult.response || {};
      const notes = [
        "Availability values are currently derived from property-scoped Domits availability and fanned out across saved Channex room type mappings.",
        "Rate values are currently derived from property-scoped Domits pricing and nightly overrides, then fanned out across saved Channex rate plan mappings.",
        "CTA/CTD, stop-sell, occupancy-based pricing, taxes, and currency fields are omitted because they are not clearly available in the current Domits ARI preview sources.",
      ];

      if (!preview.ready) {
        return ok({
          channel: preview.channel || "CHANNEX",
          integrationAccountId: preview.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: false,
          missingMappings: Array.isArray(preview.missingMappings) ? preview.missingMappings : [],
          sourceSummary: preview.sourceSummary ?? null,
          availabilityPayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          restrictionRatePayloadPreview: {
            items: [],
            groupedPayloads: [],
          },
          notes,
        });
      }

      const availabilityItems = (Array.isArray(preview.availabilityPreview) ? preview.availabilityPreview : []).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        date: item.date,
        availability: item.availability,
      }));
      const availabilityPayloadGroups = Array.from(
        new Map(
          availabilityItems.map((item) => [
            `${item.externalPropertyId}::${item.externalRoomTypeId}`,
            {
              externalPropertyId: item.externalPropertyId,
              externalRoomTypeId: item.externalRoomTypeId,
              values: availabilityItems
                .filter(
                  (candidate) =>
                    candidate.externalPropertyId === item.externalPropertyId &&
                    candidate.externalRoomTypeId === item.externalRoomTypeId
                )
                .map((candidate) => ({
                  date: candidate.date,
                  availability: candidate.availability,
                })),
            },
          ])
        ).values()
      );

      const restrictionRateItems = (Array.isArray(preview.rateRestrictionPreview)
        ? preview.rateRestrictionPreview
        : []
      ).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        externalRatePlanId: item.externalRatePlanId,
        date: item.date,
        nightlyPrice: item.nightlyPrice ?? null,
        restrictions: Array.isArray(item.restrictions)
          ? item.restrictions.map((restriction) => ({
              restriction: restriction.restriction,
              value: restriction.value,
            }))
          : [],
      }));
      const restrictionRatePayloadGroups = Array.from(
        new Map(
          restrictionRateItems.map((item) => [
            `${item.externalPropertyId}::${item.externalRoomTypeId}::${item.externalRatePlanId}`,
            {
              externalPropertyId: item.externalPropertyId,
              externalRoomTypeId: item.externalRoomTypeId,
              externalRatePlanId: item.externalRatePlanId,
              values: restrictionRateItems
                .filter(
                  (candidate) =>
                    candidate.externalPropertyId === item.externalPropertyId &&
                    candidate.externalRoomTypeId === item.externalRoomTypeId &&
                    candidate.externalRatePlanId === item.externalRatePlanId
                )
                .map((candidate) => ({
                  date: candidate.date,
                  nightlyPrice: candidate.nightlyPrice,
                  restrictions: candidate.restrictions,
                })),
            },
          ])
        ).values()
      );

      if (!preview.sourceSummary?.hasBasePricing) {
        notes.push("Base property pricing is missing, so nightlyPrice may be null unless a calendar override price exists.");
      }
      if (!preview.sourceSummary?.availabilityRestrictions) {
        notes.push("No Domits availability restrictions were found for this property, so only nightlyPrice fields are shown in rate payload previews.");
      }

      return ok({
        channel: preview.channel || "CHANNEX",
        integrationAccountId: preview.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        ready: true,
        missingMappings: Array.isArray(preview.missingMappings) ? preview.missingMappings : [],
        sourceSummary: preview.sourceSummary ?? null,
        availabilityPayloadPreview: {
          items: availabilityItems,
          groupedPayloads: availabilityPayloadGroups,
        },
        restrictionRatePayloadPreview: {
          items: restrictionRateItems,
          groupedPayloads: restrictionRatePayloadGroups,
        },
        notes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex ARI payload preview.",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_FAILED",
        details,
      });
    }
  }

  async syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }
    if (!normalizedDateFrom) {
      return bad(400, { error: "Invalid or missing required query param: dateFrom" });
    }
    if (!normalizedDateTo) {
      return bad(400, { error: "Invalid or missing required query param: dateTo" });
    }
    if (normalizedDateFrom > normalizedDateTo) {
      return bad(400, {
        error: "dateFrom must be less than or equal to dateTo.",
      });
    }

    try {
      const payloadPreviewResult = await this.previewChannexAriPayloads(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
      if (payloadPreviewResult?.statusCode !== 200) {
        return payloadPreviewResult;
      }

      const payloadPreview = payloadPreviewResult.response || {};
      const baseNotes = [
        ...(Array.isArray(payloadPreview.notes) ? payloadPreview.notes : []),
        "Manual staging sync only. This endpoint sends availability updates directly and does not run a scheduler, retries, or sync-state persistence.",
        "Approved temporary availability mapping rule applied: Domits availability true => 1, false => 0.",
      ];

      if (!payloadPreview.ready) {
        return ok({
          channel: payloadPreview.channel || "CHANNEX",
          integrationAccountId: payloadPreview.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: false,
          calledProvider: false,
          requestCount: 0,
          results: [],
          notes: baseNotes,
          missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
        });
      }

      const groupedPayloads = Array.isArray(payloadPreview?.availabilityPayloadPreview?.groupedPayloads)
        ? payloadPreview.availabilityPayloadPreview.groupedPayloads
        : [];

      if (!groupedPayloads.length) {
        return ok({
          channel: payloadPreview.channel || "CHANNEX",
          integrationAccountId: payloadPreview.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: true,
          calledProvider: false,
          requestCount: 0,
          results: [],
          notes: [...baseNotes, "No availability payload groups were generated, so nothing was sent to Channex."],
        });
      }

      const transformedPayloads = groupedPayloads.map((group) => ({
        externalPropertyId: group.externalPropertyId,
        externalRoomTypeId: group.externalRoomTypeId,
        values: (Array.isArray(group.values) ? group.values : []).map((value) => {
          if (typeof value?.availability !== "boolean") {
            const error = new Error("Availability payload preview contained a non-boolean availability value.");
            error.code = "CHANNEX_AVAILABILITY_PREVIEW_INVALID";
            throw error;
          }

          return {
            property_id: group.externalPropertyId,
            room_type_id: group.externalRoomTypeId,
            date: value.date,
            availability: value.availability ? 1 : 0,
          };
        }),
      }));

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

      const providerResult = await this.channexProviderClient.pushAvailability(secret, transformedPayloads);
      const results = Array.isArray(providerResult?.results) ? providerResult.results : [];

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        ready: true,
        calledProvider: true,
        requestCount: transformedPayloads.length,
        results: results.map((result) => ({
          externalPropertyId: result.externalPropertyId ?? null,
          externalRoomTypeId: result.externalRoomTypeId ?? null,
          requestBody: result.requestBody ?? null,
          providerStatus: result.providerStatus ?? null,
          httpStatus: result.httpStatus ?? null,
          success: !!result.success,
          taskId: result.taskId ?? null,
          warnings: Array.isArray(result.warnings) ? result.warnings : [],
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
        })),
        notes: baseNotes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to sync Channex availability.",
        errorCode: "CHANNEX_AVAILABILITY_SYNC_FAILED",
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
