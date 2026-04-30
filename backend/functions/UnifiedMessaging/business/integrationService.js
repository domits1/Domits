import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../data/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../data/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../data/integrationSyncRepository.js";
import ReservationLinkRepository from "../data/reservationLinkRepository.js";
import ChannexSyncEvidenceRepository from "../data/channexSyncEvidenceRepository.js";
import ChannexBookingRevisionRepository from "../data/channexBookingRevisionRepository.js";
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
const compareAlphabetically = (left, right) => String(left).localeCompare(String(right));
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
const getUtcTodayIsoDate = () => new Date().toISOString().slice(0, 10);
const addDaysToIsoDate = (isoDate, days) => {
  const normalized = parseIsoDateParam(isoDate);
  if (!normalized || !Number.isFinite(Number(days))) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Math.trunc(Number(days)));
  return date.toISOString().slice(0, 10);
};
const isoDateToUtcStartMs = (value) => {
  const normalized = parseIsoDateParam(value);
  if (!normalized) return null;

  const timestamp = new Date(`${normalized}T00:00:00.000Z`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
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
const formatNightlyPriceForChannexRate = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue.toFixed(2);
};
const CHANNEX_SUPPORTED_RESTRICTION_FIELDS = [
  "closed_to_arrival",
  "closed_to_departure",
  "max_stay",
  "min_stay_through",
  "stop_sell",
];
const normalizeRestrictionInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.trunc(numericValue) : null;
};
const normalizeRestrictionBoolean = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
};
const setNullableField = (target, field, value) => {
  if (value === null) return;
  target[field] = value;
};
const setPositiveField = (target, field, value) => {
  if (value === null || value <= 0) return;
  target[field] = value;
};
const copySupportedChannexRestrictions = (source) => {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const stopSell = normalizeRestrictionBoolean(source.stop_sell);
    const closedToArrival = normalizeRestrictionBoolean(source.closed_to_arrival);
    const closedToDeparture = normalizeRestrictionBoolean(source.closed_to_departure);
    const minStayThrough = normalizeRestrictionInteger(source.min_stay_through);
    const maxStay = normalizeRestrictionInteger(source.max_stay);
    const out = {};
    if (stopSell === true) out.stop_sell = true;
    if (closedToArrival === true) out.closed_to_arrival = true;
    if (closedToDeparture === true) out.closed_to_departure = true;
    setNullableField(out, "min_stay_through", minStayThrough);
    setPositiveField(out, "max_stay", maxStay);
    return out;
  }

  return {};
};
const buildChannexRestrictionMapping = (restrictions) => {
  const supportedByField = new Map();
  const omittedRestrictions = [];

  for (const restriction of Array.isArray(restrictions) ? restrictions : []) {
    const domitsRestriction = requireStr(restriction?.restriction);
    const value = normalizeRestrictionInteger(restriction?.value);
    if (!domitsRestriction || value === null) continue;

    if (domitsRestriction === "MinimumStay") {
      supportedByField.set("min_stay_through", {
        domitsRestriction,
        channexField: "min_stay_through",
        value,
      });
      continue;
    }

    if (domitsRestriction === "MaximumStay") {
      if (value > 0) {
        supportedByField.set("max_stay", {
          domitsRestriction,
          channexField: "max_stay",
          value,
        });
      } else {
        omittedRestrictions.push({
          domitsRestriction,
          value,
          reason: "Domits MaximumStay values less than or equal to 0 mean no maximum, so Channex max_stay is omitted.",
        });
      }
      continue;
    }

    omittedRestrictions.push({
      domitsRestriction,
      value,
      reason: "No safe Domits-to-Channex restriction mapping is implemented for this restriction.",
    });
  }

  const supportedRestrictions = Array.from(supportedByField.values()).sort((a, b) =>
    a.channexField.localeCompare(b.channexField)
  );
  const channexRestrictions = supportedRestrictions.reduce(
    (out, restriction) => ({
      ...out,
      [restriction.channexField]: restriction.value,
    }),
    {}
  );

  return {
    channexRestrictions,
    supportedRestrictions,
    omittedRestrictions,
    supportedChannexRestrictionFields: supportedRestrictions.map((restriction) => restriction.channexField),
    omittedDomitsRestrictionNames: Array.from(
      new Set(omittedRestrictions.map((restriction) => restriction.domitsRestriction).filter(Boolean))
    ).sort(compareAlphabetically),
  };
};
const buildCalendarRestrictionOverrideSummary = (override) => {
  const stopSell = normalizeRestrictionBoolean(override?.stopSell);
  const closedToArrival = normalizeRestrictionBoolean(override?.closedToArrival);
  const closedToDeparture = normalizeRestrictionBoolean(override?.closedToDeparture);
  const minStay = normalizeRestrictionInteger(override?.minStay);
  const maxStay = normalizeRestrictionInteger(override?.maxStay);

  return {
    stopSell,
    closedToArrival,
    closedToDeparture,
    minStay,
    maxStay,
    hasAnyValue:
      stopSell !== null ||
      closedToArrival !== null ||
      closedToDeparture !== null ||
      minStay !== null ||
      maxStay !== null,
  };
};
const addGlobalRestrictionField = (out, globalRestrictionMapping, channexField) => {
  const globalRestriction = (Array.isArray(globalRestrictionMapping?.supportedRestrictions)
    ? globalRestrictionMapping.supportedRestrictions
    : []
  ).find((restriction) => restriction.channexField === channexField);
  if (!globalRestriction) return;

  out.channexRestrictions[channexField] = globalRestriction.value;
  out.supportedRestrictions.push({ ...globalRestriction, source: "global_availability_restriction" });
};
const addBooleanCalendarRestrictionField = ({
  out,
  overrideSummary,
  sourceField,
  domitsRestriction,
  channexField,
}) => {
  const value = overrideSummary?.[sourceField];
  if (value === true) {
    out.channexRestrictions[channexField] = true;
    out.supportedRestrictions.push({
      domitsRestriction,
      channexField,
      value: true,
      source: "calendar_override",
    });
    return;
  }

  if (value === false) {
    out.omittedRestrictions.push({
      domitsRestriction,
      channexField,
      value: false,
      source: "calendar_override",
      reason:
        "Explicit false calendar override values are omitted because Channex clearing semantics are not verified in this integration.",
    });
  }
};
const buildEffectiveChannexRestrictionMapping = (globalRestrictionMapping, override) => {
  const overrideSummary = buildCalendarRestrictionOverrideSummary(override);
  const out = {
    channexRestrictions: {},
    supportedRestrictions: [],
    omittedRestrictions: Array.isArray(globalRestrictionMapping?.omittedRestrictions)
      ? globalRestrictionMapping.omittedRestrictions.map((restriction) => ({ ...restriction }))
      : [],
    calendarRestrictionOverride: {
      stopSell: overrideSummary.stopSell,
      closedToArrival: overrideSummary.closedToArrival,
      closedToDeparture: overrideSummary.closedToDeparture,
      minStay: overrideSummary.minStay,
      maxStay: overrideSummary.maxStay,
    },
  };

  addBooleanCalendarRestrictionField({
    out,
    overrideSummary,
    sourceField: "stopSell",
    domitsRestriction: "stopSell",
    channexField: "stop_sell",
  });
  addBooleanCalendarRestrictionField({
    out,
    overrideSummary,
    sourceField: "closedToArrival",
    domitsRestriction: "closedToArrival",
    channexField: "closed_to_arrival",
  });
  addBooleanCalendarRestrictionField({
    out,
    overrideSummary,
    sourceField: "closedToDeparture",
    domitsRestriction: "closedToDeparture",
    channexField: "closed_to_departure",
  });

  if (overrideSummary.minStay === null) {
    addGlobalRestrictionField(out, globalRestrictionMapping, "min_stay_through");
  } else {
    out.channexRestrictions.min_stay_through = overrideSummary.minStay;
    out.supportedRestrictions.push({
      domitsRestriction: "minStay",
      channexField: "min_stay_through",
      value: overrideSummary.minStay,
      source: "calendar_override",
    });
  }

  if (overrideSummary.maxStay === null) {
    addGlobalRestrictionField(out, globalRestrictionMapping, "max_stay");
  } else if (overrideSummary.maxStay > 0) {
    out.channexRestrictions.max_stay = overrideSummary.maxStay;
    out.supportedRestrictions.push({
      domitsRestriction: "maxStay",
      channexField: "max_stay",
      value: overrideSummary.maxStay,
      source: "calendar_override",
    });
  } else {
    out.omittedRestrictions.push({
      domitsRestriction: "maxStay",
      channexField: "max_stay",
      value: overrideSummary.maxStay,
      source: "calendar_override",
      reason:
        "Domits calendar override maxStay values less than or equal to 0 mean no maximum, so Channex max_stay is omitted.",
    });
  }

  out.supportedChannexRestrictionFields = Array.from(
    new Set(out.supportedRestrictions.map((restriction) => restriction.channexField).filter(Boolean))
  ).sort(compareAlphabetically);
  out.omittedDomitsRestrictionNames = Array.from(
    new Set(out.omittedRestrictions.map((restriction) => restriction.domitsRestriction).filter(Boolean))
  ).sort(compareAlphabetically);

  return out;
};
const collectChannexRestrictionFieldsFromGroups = (groups) => {
  const fields = new Set();
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const value of Array.isArray(group?.values) ? group.values : []) {
      for (const field of CHANNEX_SUPPORTED_RESTRICTION_FIELDS) {
        if (Object.hasOwn(value || {}, field)) {
          fields.add(field);
        }
      }
    }
  }

  return Array.from(fields).sort(compareAlphabetically);
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
      SELECT
        property_id,
        calendar_date,
        is_available,
        nightly_price,
        stop_sell,
        closed_to_arrival,
        closed_to_departure,
        min_stay,
        max_stay,
        updated_at
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
    stopSell: row?.stop_sell === null || row?.stop_sell === undefined ? null : Boolean(row.stop_sell),
    closedToArrival:
      row?.closed_to_arrival === null || row?.closed_to_arrival === undefined
        ? null
        : Boolean(row.closed_to_arrival),
    closedToDeparture:
      row?.closed_to_departure === null || row?.closed_to_departure === undefined
        ? null
        : Boolean(row.closed_to_departure),
    minStay: toIntegerOrNull(row?.min_stay),
    maxStay: toIntegerOrNull(row?.max_stay),
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
const stringifyJsonOrNull = (value) => {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      serializationError: true,
      details: describeLocalError(error),
    });
  }
};
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
});
const parseStructuredEvidenceField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return parseJsonSafely(value) ?? value;
};
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
const CHANNEX_CERTIFICATION_FULL_SYNC_DAYS = 500;
const CHANNEX_BOOKING_REVISION_LIST_DEFAULT_LIMIT = 50;
const CHANNEX_BOOKING_REVISION_LIST_MAX_LIMIT = 100;
const CHANNEX_STATUS = {
  NOT_CONNECTED: "NOT_CONNECTED",
  PENDING_PROVIDER_VALIDATION: "PENDING_PROVIDER_VALIDATION",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  DISCONNECTED: "DISCONNECTED",
  CONNECTED: "CONNECTED",
};
const getUnavailableChannexStatus = (integration) =>
  integration ? CHANNEX_STATUS.DISCONNECTED : CHANNEX_STATUS.NOT_CONNECTED;
const getChannexProviderValidationFailureStatus = (providerStatus) => {
  if (providerStatus === "UNAUTHORIZED") {
    return CHANNEX_STATUS.RECONNECT_REQUIRED;
  }
  return CHANNEX_STATUS.VALIDATION_FAILED;
};
const getInvalidRequestOrFailedStatus = (statusCode) => {
  if (statusCode === 400) {
    return "INVALID_REQUEST";
  }
  return "FAILED";
};
const normalizePositiveLimit = (limit, defaultLimit, maxLimit) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit)) return defaultLimit;

  return Math.min(Math.max(Math.trunc(numericLimit), 1), maxLimit);
};
const getCaptureState = (options) => {
  const captureState = options?.captureState;
  if (captureState && typeof captureState === "object") {
    return captureState;
  }
  return null;
};
const buildInvalidRequestEvidencePatch = (errorCode, errorMessage) => ({
  status: "INVALID_REQUEST",
  errors: [{ errorCode, errorMessage }],
});
const buildChannexSyncEvidencePatch = ({
  normalizedUserId,
  normalizedDomitsPropertyId,
  syncType,
  dateFrom,
  dateTo,
  startedAt,
  evidencePatch,
  taskIdsDefault = [],
}) => ({
  userId: normalizedUserId,
  integrationAccountId: evidencePatch.integrationAccountId ?? null,
  domitsPropertyId: normalizedDomitsPropertyId,
  syncType,
  dateFrom,
  dateTo,
  startedAt,
  finishedAt: nowMs(),
  status: evidencePatch.status ?? "FAILED",
  overallSuccess: evidencePatch.overallSuccess ?? false,
  mappingSnapshot: evidencePatch.mappingSnapshot ?? null,
  groupedOutboundPayloadSnapshot: evidencePatch.groupedOutboundPayloadSnapshot ?? null,
  providerResponseSummary: evidencePatch.providerResponseSummary ?? null,
  taskIds: evidencePatch.taskIds ?? taskIdsDefault,
  warnings: evidencePatch.warnings ?? [],
  errors: evidencePatch.errors ?? [],
  notes: evidencePatch.notes ?? [],
  rawDetails: evidencePatch.rawDetails ?? null,
});
const buildPreviewDateRangeValidationResponse = ({
  normalizedUserId,
  normalizedDomitsPropertyId,
  normalizedDateFrom,
  normalizedDateTo,
}) => {
  if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
  if (!normalizedDomitsPropertyId) return bad(400, { error: "Missing required query param: domitsPropertyId" });
  if (!normalizedDateFrom) return bad(400, { error: "Invalid or missing required query param: dateFrom" });
  if (!normalizedDateTo) return bad(400, { error: "Invalid or missing required query param: dateTo" });
  if (normalizedDateFrom > normalizedDateTo) {
    return bad(400, {
      error: "dateFrom must be less than or equal to dateTo.",
    });
  }
  return null;
};
const buildSyncDateRangeValidationFailure = ({
  normalizedUserId,
  normalizedDomitsPropertyId,
  normalizedDateFrom,
  normalizedDateTo,
  rawDateFrom = null,
  rawDateTo = null,
  requireCompleteDatePair = false,
  usingDefaultDateRange = false,
}) => {
  if (!normalizedUserId) {
    return {
      response: bad(400, { error: "Missing required query param: userId" }),
      evidencePatch: buildInvalidRequestEvidencePatch("MISSING_USER_ID", "Missing required query param: userId"),
    };
  }
  if (!normalizedDomitsPropertyId) {
    return {
      response: bad(400, { error: "Missing required query param: domitsPropertyId" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "MISSING_DOMITS_PROPERTY_ID",
        "Missing required query param: domitsPropertyId"
      ),
    };
  }
  if (requireCompleteDatePair && !usingDefaultDateRange && (!rawDateFrom || !rawDateTo)) {
    const message = "Provide both dateFrom and dateTo, or omit both to use the default certification full-sync range.";
    return {
      response: bad(400, { error: message }),
      evidencePatch: buildInvalidRequestEvidencePatch("CHANNEX_FULL_SYNC_PARTIAL_DATE_RANGE", message),
    };
  }
  if (!normalizedDateFrom) {
    return {
      response: bad(400, { error: "Invalid or missing required query param: dateFrom" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_FROM",
        "Invalid or missing required query param: dateFrom"
      ),
    };
  }
  if (!normalizedDateTo) {
    return {
      response: bad(400, { error: "Invalid or missing required query param: dateTo" }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_TO",
        "Invalid or missing required query param: dateTo"
      ),
    };
  }
  if (normalizedDateFrom > normalizedDateTo) {
    return {
      response: bad(400, {
        error: "dateFrom must be less than or equal to dateTo.",
      }),
      evidencePatch: buildInvalidRequestEvidencePatch(
        "INVALID_DATE_RANGE",
        "dateFrom must be less than or equal to dateTo."
      ),
    };
  }
  return null;
};
const withOptionalDetails = (target, details) => {
  if (details) {
    target.details = details;
  }
  return target;
};
const dedupeByJson = (items) =>
  Array.from(
    new Map(
      (Array.isArray(items) ? items : [])
        .filter((item) => item !== undefined && item !== null)
        .map((item) => [JSON.stringify(item), item])
    ).values()
  );
const collectTaskIdsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : [])
      .map((result) => requireStr(result?.taskId))
      .filter(Boolean)
  );
const collectWarningsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : []).flatMap((result) =>
      Array.isArray(result?.warnings) ? result.warnings.filter((warning) => warning !== undefined && warning !== null) : []
    )
  );
const collectErrorsFromResultList = (results) =>
  dedupeByJson(
    (Array.isArray(results) ? results : [])
      .filter((result) => result?.success === false || result?.errorCode || result?.errorMessage)
      .map((result) => ({
        externalPropertyId: result?.externalPropertyId ?? null,
        externalRoomTypeId: result?.externalRoomTypeId ?? null,
        externalRatePlanId: result?.externalRatePlanId ?? null,
        errorCode: result?.errorCode ?? null,
        errorMessage: result?.errorMessage ?? null,
        httpStatus: result?.httpStatus ?? null,
      }))
  );
const resultListHasWarnings = (results) =>
  Array.isArray(results) && results.some((result) => Array.isArray(result?.warnings) && result.warnings.length > 0);
const resultListHasErrors = (results) =>
  Array.isArray(results) && results.some((result) => result?.success === false);
const appendUniqueNotes = (baseNotes, extraNotes) => {
  for (const note of Array.isArray(extraNotes) ? extraNotes : []) {
    if (note && !baseNotes.includes(note)) baseNotes.push(note);
  }
};
const getRestrictionSkipNote = ({ availabilityStep, availabilityCalledProvider, availabilityWarnings, availabilityErrors }) => {
  if (availabilityStep?.statusCode === 200 && !availabilityCalledProvider) {
    return "Restrictions sync was skipped because availability sync did not make a provider call.";
  }
  if (availabilityWarnings || availabilityErrors) {
    return "Restrictions sync was skipped because availability sync returned warnings or errors.";
  }
  if (availabilityStep?.statusCode === 200) {
    return null;
  }
  return "Restrictions sync was skipped because availability sync did not complete successfully.";
};
const deriveEvidenceOutcome = ({ statusCode, ready, calledProvider, results, overallSuccess }) => {
  const normalizedResults = Array.isArray(results) ? results : [];
  const warningCount = collectWarningsFromResultList(normalizedResults).length;
  const failedCount = normalizedResults.filter((result) => result?.success === false).length;
  const successfulCount = normalizedResults.filter((result) => result?.success === true).length;

  if (statusCode === 400) return { status: "INVALID_REQUEST", overallSuccess: false };
  if (statusCode >= 500) return { status: "FAILED", overallSuccess: false };
  if (statusCode >= 401) return { status: "BLOCKED", overallSuccess: false };
  if (ready === false) return { status: "BLOCKED", overallSuccess: false };
  if (!calledProvider) return { status: "NOOP", overallSuccess: false };
  if (overallSuccess === true && warningCount === 0 && failedCount === 0) {
    return { status: "SUCCESS", overallSuccess: true };
  }
  if (overallSuccess === true && warningCount > 0 && failedCount === 0) {
    return { status: "COMPLETED_WITH_WARNINGS", overallSuccess: true };
  }
  if (failedCount > 0 && successfulCount > 0) return { status: "PARTIAL", overallSuccess: false };
  if (failedCount > 0) return { status: "FAILED", overallSuccess: false };
  if (warningCount > 0) return { status: "COMPLETED_WITH_WARNINGS", overallSuccess: true };

  return { status: "SUCCESS", overallSuccess: true };
};
const buildFailedStepErrors = (step, response, fallbackCode, fallbackMessage, options = {}) => {
  if (step?.statusCode === 200 || (options.optional && (step === null || step === undefined))) {
    return [];
  }
  return [
    {
      errorCode: response?.errorCode ?? fallbackCode,
      errorMessage: response?.error ?? fallbackMessage,
    },
  ];
};
const getStepResponse = (step, response) => (step?.statusCode === 200 ? response : step);
const getOptionalStepResponse = (step, response) => {
  if (step === null || step === undefined) {
    return null;
  }
  return getStepResponse(step, response);
};
const getSuccessfulStepSummary = (response) => ({
  requestCount: response?.requestCount ?? 0,
  calledProvider: response?.calledProvider ?? false,
  results: response?.results ?? [],
});
const getStepSummary = (step, response) =>
  step?.statusCode === 200 ? getSuccessfulStepSummary(response) : step;
const getOptionalStepSummary = (step, response) => {
  if (step === null || step === undefined) {
    return null;
  }
  return getStepSummary(step, response);
};
const getProviderCalledFromEvidenceSummary = (providerSummary, requestCount) => {
  if (typeof providerSummary?.calledProvider === "boolean") {
    return providerSummary.calledProvider;
  }
  if (Number.isFinite(requestCount)) {
    return requestCount > 0;
  }
  return false;
};
const getBookingReceiveStatus = ({ fetched, persisted, failed }) => {
  if (fetched.length === 0) {
    return "NOOP";
  }
  if (failed.length === 0) {
    return "SUCCESS";
  }
  if (persisted.length) {
    return "PARTIAL";
  }
  return "FAILED";
};
const getBookingAcknowledgementStatus = ({ overallSuccess, acknowledged }) => {
  if (overallSuccess) {
    return "SUCCESS";
  }
  if (acknowledged.length) {
    return "PARTIAL";
  }
  return "FAILED";
};
const getCombinedSyncStatus = ({
  overallSuccess,
  providerCalled,
  combinedErrors,
  combinedWarnings,
  blockNoProviderWithErrors = false,
}) => {
  if (overallSuccess) {
    return "SUCCESS";
  }
  if (providerCalled) {
    if (combinedErrors.length === 0 && combinedWarnings.length) {
      return "COMPLETED_WITH_WARNINGS";
    }
    return "PARTIAL";
  }
  if (blockNoProviderWithErrors && combinedErrors.length) {
    return "BLOCKED";
  }
  return "NOOP";
};
const appendMissingMappingNotes = (notes, missingMappings) => {
  if (Array.isArray(missingMappings) && missingMappings.length) {
    return [...notes, `Missing mappings: ${missingMappings.join(", ")}`];
  }
  return notes;
};
const getEffectiveNightlyPrice = ({ override, pricing, isoDate }) => {
  if (override?.nightlyPrice !== null && override?.nightlyPrice !== undefined) {
    return override.nightlyPrice;
  }
  if (pricing) {
    return isWeekendIsoDate(isoDate) ? pricing.weekendRate : pricing.roomRate;
  }
  return null;
};
const getEffectiveAvailability = ({ override, isAvailableFromWindows }) => {
  if (override?.isAvailable === null || override?.isAvailable === undefined) {
    return isAvailableFromWindows;
  }
  return override.isAvailable;
};
const normalizeAvailabilityWindows = (availabilityWindows) =>
  (Array.isArray(availabilityWindows) ? availabilityWindows : [])
    .map((entry) => ({
      availableStartDate: normalizeValueToCalendarInt(entry?.availableStartDate),
      availableEndDate: normalizeValueToCalendarInt(entry?.availableEndDate),
    }))
    .filter((entry) => entry.availableStartDate && entry.availableEndDate);
const buildCalendarOverrideMap = (calendarOverrides) =>
  new Map(
    (Array.isArray(calendarOverrides) ? calendarOverrides : [])
      .map((entry) => {
        const isoDate = calendarIntToIsoDate(entry?.date);
        if (!isoDate) return null;

        return [
          isoDate,
          {
            isAvailable: entry?.isAvailable ?? null,
            nightlyPrice: entry?.nightlyPrice ?? null,
            stopSell: entry?.stopSell ?? null,
            closedToArrival: entry?.closedToArrival ?? null,
            closedToDeparture: entry?.closedToDeparture ?? null,
            minStay: entry?.minStay ?? null,
            maxStay: entry?.maxStay ?? null,
            updatedAt: entry?.updatedAt ?? null,
          },
        ];
      })
      .filter(Boolean)
  );
const normalizeAvailabilityRestrictionRows = (restrictions) =>
  (Array.isArray(restrictions) ? restrictions : [])
    .map((restriction) => ({
      restriction: requireStr(restriction?.restriction),
      value: Number.isFinite(Number(restriction?.value)) ? Number(restriction.value) : null,
    }))
    .filter((restriction) => restriction.restriction && restriction.value !== null);
const buildAriPreviewCollections = ({
  dates,
  overrideMap,
  restrictionMapping,
  normalizedAvailabilityWindows,
  pricing,
  readiness,
  normalizedDomitsPropertyId,
  normalizedRestrictions,
}) => {
  const availabilityPreview = [];
  const rateRestrictionPreview = [];
  const effectiveChannexRestrictionFields = new Set();
  const supportedCalendarRestrictionOverrideFields = new Set();

  for (const isoDate of dates) {
    const calendarDate = isoDateToCalendarInt(isoDate);
    const override = overrideMap.get(isoDate) || null;
    const effectiveRestrictionMapping = buildEffectiveChannexRestrictionMapping(restrictionMapping, override);
    Object.keys(effectiveRestrictionMapping.channexRestrictions).forEach((field) =>
      effectiveChannexRestrictionFields.add(field)
    );
    effectiveRestrictionMapping.supportedRestrictions
      .filter((restriction) => restriction.source === "calendar_override")
      .forEach((restriction) => supportedCalendarRestrictionOverrideFields.add(restriction.channexField));

    const isAvailableFromWindows = normalizedAvailabilityWindows.some(
      (entry) => calendarDate >= entry.availableStartDate && calendarDate <= entry.availableEndDate
    );
    const effectiveAvailability = getEffectiveAvailability({ override, isAvailableFromWindows });
    const effectiveNightlyPrice = getEffectiveNightlyPrice({ override, pricing, isoDate });

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
        channexRestrictions: { ...effectiveRestrictionMapping.channexRestrictions },
        supportedRestrictions: effectiveRestrictionMapping.supportedRestrictions.map((restriction) => ({ ...restriction })),
        omittedRestrictions: effectiveRestrictionMapping.omittedRestrictions.map((restriction) => ({ ...restriction })),
        calendarRestrictionOverride: { ...effectiveRestrictionMapping.calendarRestrictionOverride },
        restrictions: effectiveRestrictionMapping.supportedRestrictions.map((restriction) => ({
          restriction: restriction.domitsRestriction,
          channexField: restriction.channexField,
          value: restriction.value,
          source: restriction.source ?? null,
        })),
        domitsRestrictions: normalizedRestrictions.map((restriction) => ({
          restriction: restriction.restriction,
          value: restriction.value,
        })),
      });
    }
  }

  return {
    availabilityPreview,
    rateRestrictionPreview,
    supportedCalendarRestrictionOverrideFields,
    effectiveChannexRestrictionFields,
  };
};
const buildAvailabilityPayloadGroups = (availabilityItems) =>
  Array.from(
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
const buildRestrictionRateItems = (rateRestrictionPreview) =>
  (Array.isArray(rateRestrictionPreview) ? rateRestrictionPreview : []).map((item) => ({
    externalPropertyId: item.externalPropertyId,
    externalRoomTypeId: item.externalRoomTypeId,
    externalRatePlanId: item.externalRatePlanId,
    date: item.date,
    nightlyPrice: item.nightlyPrice ?? null,
    rate: formatNightlyPriceForChannexRate(item.nightlyPrice),
    channexRestrictions: copySupportedChannexRestrictions(item.channexRestrictions),
    supportedRestrictions: Array.isArray(item.supportedRestrictions)
      ? item.supportedRestrictions.map((restriction) => ({ ...restriction }))
      : [],
    omittedRestrictions: Array.isArray(item.omittedRestrictions)
      ? item.omittedRestrictions.map((restriction) => ({ ...restriction }))
      : [],
    restrictions: Array.isArray(item.restrictions)
      ? item.restrictions.map((restriction) => ({
          restriction: restriction.restriction,
          channexField: restriction.channexField,
          value: restriction.value,
          source: restriction.source ?? null,
        }))
      : [],
    calendarRestrictionOverride: item.calendarRestrictionOverride
      ? { ...item.calendarRestrictionOverride }
      : null,
  }));
const buildRestrictionRatePayloadGroups = (restrictionRateItems) =>
  Array.from(
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
              rate: candidate.rate,
              ...copySupportedChannexRestrictions(candidate.channexRestrictions),
              channexRestrictions: { ...candidate.channexRestrictions },
              supportedRestrictions: candidate.supportedRestrictions,
              omittedRestrictions: candidate.omittedRestrictions,
              restrictions: candidate.restrictions,
              calendarRestrictionOverride: candidate.calendarRestrictionOverride,
            })),
        },
      ])
    ).values()
  );
const CHANNEX_ARI_PAYLOAD_PREVIEW_BASE_NOTES = [
  "Availability values are currently derived from property-scoped Domits availability and fanned out across saved Channex room type mappings.",
  "Rate values are currently derived from property-scoped Domits pricing and nightly overrides, then fanned out across saved Channex rate plan mappings.",
  "Supported Domits restrictions are mapped as date-level minStay or global MinimumStay -> Channex min_stay_through, and date-level maxStay or global MaximumStay -> Channex max_stay when the effective value is greater than 0.",
  "Supported date-level calendar restriction booleans are mapped as stopSell -> stop_sell, closedToArrival -> closed_to_arrival, and closedToDeparture -> closed_to_departure when explicitly true.",
  "Date-level calendar restriction overrides take priority over global Domits availability restrictions for the same Channex field.",
  "Explicit false values for stop_sell, closed_to_arrival, and closed_to_departure are omitted because Channex clearing semantics are not verified in this integration.",
  "MinimumAdvanceReservation, MaximumNightsPerYear, PreparationTimeDays, occupancy-based pricing, taxes, and currency fields are omitted from Channex restriction payloads.",
];
const createChannexAriPayloadPreviewNotes = () => [...CHANNEX_ARI_PAYLOAD_PREVIEW_BASE_NOTES];
const appendChannexAriPayloadPreviewNotes = (notes, preview) => {
  const supportedRestrictionFields = Array.isArray(preview.sourceSummary?.supportedChannexRestrictionFields)
    ? preview.sourceSummary.supportedChannexRestrictionFields
    : [];
  const omittedRestrictionNames = Array.isArray(preview.sourceSummary?.omittedDomitsRestrictionNames)
    ? preview.sourceSummary.omittedDomitsRestrictionNames
    : [];
  if (supportedRestrictionFields.length) {
    notes.push(`Supported Channex restriction fields present in this preview: ${supportedRestrictionFields.join(", ")}.`);
  } else {
    notes.push("No supported global stay restrictions or date-level calendar restriction overrides were found, so rate payload previews remain rate-only.");
  }
  if (omittedRestrictionNames.length) {
    notes.push(`Omitted Domits availability restrictions in this preview: ${omittedRestrictionNames.join(", ")}.`);
  }
  if (!preview.sourceSummary?.hasBasePricing) {
    notes.push("Base property pricing is missing, so nightlyPrice may be null unless a calendar override price exists.");
  }
  if (
    !preview.sourceSummary?.availabilityRestrictions &&
    !preview.sourceSummary?.calendarRestrictionOverrides
  ) {
    notes.push("No Domits availability restrictions or date-level calendar restriction overrides were found for this property, so only rate fields are shown in restriction payload previews.");
  }
};
const buildChannexAvailabilitySyncValue = (group, value) => {
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
};
const buildChannexAvailabilitySyncPayloads = (groupedPayloads) =>
  groupedPayloads.map((group) => ({
    externalPropertyId: group.externalPropertyId,
    externalRoomTypeId: group.externalRoomTypeId,
    values: (Array.isArray(group.values) ? group.values : []).map((value) =>
      buildChannexAvailabilitySyncValue(group, value)
    ),
  }));
const buildChannexRestrictionSyncValue = (group, value) => {
  const rate = requireStr(value?.rate) || formatNightlyPriceForChannexRate(value?.nightlyPrice);
  if (!rate) return null;
  const mappedRestrictions = {
    ...copySupportedChannexRestrictions(value?.channexRestrictions),
    ...copySupportedChannexRestrictions(value),
  };

  return {
    property_id: group.externalPropertyId,
    rate_plan_id: group.externalRatePlanId,
    date: value.date,
    rate,
    ...mappedRestrictions,
  };
};
const buildChannexRestrictionSyncPayloads = (groupedPayloads) =>
  groupedPayloads
    .map((group) => {
      const values = (Array.isArray(group.values) ? group.values : [])
        .map((value) => buildChannexRestrictionSyncValue(group, value))
        .filter(Boolean);

      return {
        externalPropertyId: group.externalPropertyId,
        externalRoomTypeId: group.externalRoomTypeId,
        externalRatePlanId: group.externalRatePlanId,
        values,
      };
    })
    .filter((group) => group.values.length > 0);
const appendRestrictionSyncOutboundNotes = (notes, transformedPayloads) => {
  const sentChannexRestrictionFields = collectChannexRestrictionFieldsFromGroups(transformedPayloads);
  if (sentChannexRestrictionFields.length) {
    notes.push(
      `Restrictions sync included Channex restriction fields in outbound payloads: ${sentChannexRestrictionFields.join(", ")}.`
    );
  } else {
    notes.push("Restrictions sync outbound payloads are rate-only because no supported global stay restrictions or date-level calendar restriction overrides were available to send.");
  }
};
const formatChannexAvailabilityProviderResult = (result) => ({
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
});
const formatChannexRestrictionProviderResult = (result) => ({
  externalPropertyId: result.externalPropertyId ?? null,
  externalRoomTypeId: result.externalRoomTypeId ?? null,
  externalRatePlanId: result.externalRatePlanId ?? null,
  requestBody: result.requestBody ?? null,
  providerStatus: result.providerStatus ?? null,
  httpStatus: result.httpStatus ?? null,
  success: !!result.success,
  taskId: result.taskId ?? null,
  warnings: Array.isArray(result.warnings) ? result.warnings : [],
  errorCode: result.errorCode ?? null,
  errorMessage: result.errorMessage ?? null,
});
const getCapturedGroupedOutboundPayloadSnapshot = (captureState) =>
  Array.isArray(captureState?.groupedOutboundPayloadSnapshot)
    ? captureState.groupedOutboundPayloadSnapshot
    : [];
const getAriSyncOverallSuccess = ({
  availabilityStep,
  availabilityCalledProvider,
  availabilityWarnings,
  availabilityErrors,
  restrictionsStep,
  restrictionsCalledProvider,
  restrictionsWarnings,
  restrictionsErrors,
}) =>
  [
    availabilityStep?.statusCode === 200,
    availabilityCalledProvider,
    !availabilityWarnings,
    !availabilityErrors,
    restrictionsStep?.statusCode === 200,
    restrictionsCalledProvider,
    !restrictionsWarnings,
    !restrictionsErrors,
  ].every(Boolean);
const getFullSyncOverallSuccess = ({
  availabilityStep,
  restrictionsStep,
  availabilityCalledProvider,
  restrictionsCalledProvider,
  combinedWarnings,
  combinedErrors,
}) =>
  [
    availabilityStep?.statusCode === 200,
    restrictionsStep?.statusCode === 200,
    availabilityCalledProvider,
    restrictionsCalledProvider,
    combinedWarnings.length === 0,
    combinedErrors.length === 0,
  ].every(Boolean);
const createCertificationFullSyncBaseNotes = (usingDefaultDateRange) => {
  const notes = [
    "Manual staging certification-prep runner only. This endpoint executes one availability sync and one restrictions sync for the selected full range.",
    "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
  ];
  if (usingDefaultDateRange) {
    notes.push(
      `No explicit date range was supplied, so the certification full-sync used a ${CHANNEX_CERTIFICATION_FULL_SYNC_DAYS}-day UTC date range starting from today.`
    );
  }
  return notes;
};
const normalizeEvidenceDateFilters = (dateFrom, dateTo) => {
  const normalizedFilterDateFrom = requireStr(dateFrom);
  const normalizedFilterDateTo = requireStr(dateTo);
  const parsedDateFrom = normalizedFilterDateFrom ? parseIsoDateParam(normalizedFilterDateFrom) : null;
  const parsedDateTo = normalizedFilterDateTo ? parseIsoDateParam(normalizedFilterDateTo) : null;

  if (normalizedFilterDateFrom && !parsedDateFrom) {
    return { error: bad(400, { error: "Invalid query param: dateFrom" }) };
  }
  if (normalizedFilterDateTo && !parsedDateTo) {
    return { error: bad(400, { error: "Invalid query param: dateTo" }) };
  }
  if (parsedDateFrom && parsedDateTo && normalizedFilterDateFrom > normalizedFilterDateTo) {
    return { error: bad(400, { error: "dateFrom must be less than or equal to dateTo." }) };
  }

  return {
    normalizedFilterDateFrom,
    normalizedFilterDateTo,
    parsedDateFrom,
    parsedDateTo,
    error: null,
  };
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
    channexEvidence = new ChannexSyncEvidenceRepository(),
    channexBookingRevisions = new ChannexBookingRevisionRepository(),
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
    this.channexEvidence = channexEvidence;
    this.channexBookingRevisions = channexBookingRevisions;
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

  async persistCredentialIntegrationRecord({
    existing,
    integrationAccountId,
    userId,
    channel,
    displayName,
    persistedState,
    credentialsRef,
    connectedAt,
    updatedAt,
  }) {
    if (existing) {
      return this.accounts.update(existing.id, {
        displayName,
        externalAccountId: persistedState.externalAccountId,
        status: persistedState.status,
        credentialsRef,
        lastErrorCode: persistedState.lastErrorCode,
        lastErrorMessage: persistedState.lastErrorMessage,
      });
    }

    const integration = await this.accounts.create({
      id: integrationAccountId,
      userId,
      channel,
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
    return integration;
  }

  async connectCredentialIntegration(body, config) {
    const userId = requireStr(body.userId);
    const displayName = requireStr(body.displayName) || config.defaultDisplayName;
    const credentials = config.normalizeCredentials(body.credentials);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!credentials || !config.hasRequiredCredentialFields(credentials)) {
      return bad(400, {
        error: config.invalidCredentialsError,
      });
    }

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, config.channel);
      const integrationAccountId = existing?.id || randomUUID();
      const connectedAt = existing?.createdAt || nowMs();
      const updatedAt = nowMs();
      const secretPayload = config.buildSecretPayload({
        credentials,
        connectedAt,
        updatedAt,
      });

      let credentialsRef;
      try {
        credentialsRef = await config.credentialStore.ensureSecret({
          userId,
          integrationAccountId,
          payload: secretPayload,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: config.secretStoreError,
          errorCode: config.secretStoreErrorCode,
          details,
        });
      }

      const validationAttemptedAt = nowMs();
      const validationResult = await config.validateProvider(credentials);
      const providerValidation = config.buildProviderValidationRecord(validationResult, validationAttemptedAt);
      const persistedState = config.derivePersistedState(validationResult);

      try {
        await config.credentialStore.writeSecret(credentialsRef, {
          ...secretPayload,
          updatedAt: validationAttemptedAt,
          providerValidation,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: config.secretUpdateError,
          errorCode: config.secretUpdateErrorCode,
          details,
        });
      }

      let integration;
      try {
        integration = await this.persistCredentialIntegrationRecord({
          existing,
          integrationAccountId,
          userId,
          channel: config.channel,
          displayName,
          persistedState,
          credentialsRef,
          connectedAt,
          updatedAt,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: config.connectionPersistError,
          errorCode: config.connectionPersistErrorCode,
          details,
        });
      }

      return ok({
        connected: persistedState.status === config.status.CONNECTED,
        channel: config.channel,
        integration: shapeCredentialIntegrationForResponse(integration),
        credentialsSummary: config.buildCredentialSummary(credentials),
        validationMode: config.getValidationMode(validationResult),
        validationState: persistedState.status,
        providerStatus: providerValidation.providerStatus,
        accountPolicy: config.accountPolicy,
        multiAccountDeferred: true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.unexpectedConnectError,
        errorCode: config.unexpectedConnectErrorCode,
        details,
      });
    }
  }

  buildCredentialStatusResponse(config, {
    integration = null,
    integrationAccountId = integration?.id ?? null,
    status,
    validationMode,
    validationState,
    reason,
    externalAccountId = integration?.externalAccountId ?? null,
    credentialsRefPresent = false,
    secretPresent = false,
    requiredFieldsPresent = false,
  }) {
    return ok({
      channel: config.channel,
      integrationAccountId,
      status,
      validationMode,
      validationState,
      reason,
      displayName: integration?.displayName ?? null,
      externalAccountId,
      credentialsRefPresent,
      secretPresent,
      requiredFieldsPresent,
    });
  }

  async checkCredentialIntegrationStatus(userId, config) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, config.channel);
      if (!integration) {
        return this.buildCredentialStatusResponse(config, {
          integrationAccountId: null,
          status: config.status.NOT_CONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: config.status.NOT_CONNECTED,
          reason: `No ${config.providerName} integration row exists for this user.`,
        });
      }

      if (String(integration.status || "").toUpperCase() === config.status.DISCONNECTED) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.DISCONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: config.status.DISCONNECTED,
          reason: `${config.providerName} integration is disconnected in Domits and is not locally usable.`,
        });
      }

      const credentialsRefPresent = !!requireStr(integration.credentialsRef);
      if (!credentialsRefPresent) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: "Integration row exists but credentialsRef is missing.",
          credentialsRefPresent,
        });
      }

      let secret;
      try {
        secret = await config.credentialStore.readSecretOrNull(integration.credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret could not be read locally: ${details.message}`,
          credentialsRefPresent,
        });
      }

      if (!secret || typeof secret !== "object" || Array.isArray(secret)) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret is missing, unreadable, or malformed.`,
          credentialsRefPresent,
        });
      }

      const requiredFieldSummary = config.summarizeRequiredFields(secret);
      if (!config.hasRequiredCredentialFields(secret)) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret is present but required local credential fields are incomplete.`,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      const providerValidation = config.normalizeProviderValidation(secret.providerValidation);
      const normalizedStatus = String(integration.status || "").toUpperCase();
      if (
        normalizedStatus === config.status.CONNECTED &&
        providerValidation.validationState === config.status.CONNECTED
      ) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.CONNECTED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: config.status.CONNECTED,
          reason: `Stored ${config.providerName} credentials are locally valid and provider validation has explicitly succeeded.`,
          externalAccountId: integration.externalAccountId ?? providerValidation.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      if (normalizedStatus === config.status.VALIDATION_FAILED) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.VALIDATION_FAILED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: config.status.VALIDATION_FAILED,
          reason: integration.lastErrorMessage || providerValidation.errorMessage || "Provider validation failed.",
          externalAccountId: null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      return this.buildCredentialStatusResponse(config, {
        integration,
        status: config.status.PENDING_PROVIDER_VALIDATION,
        validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
        validationState: config.status.PENDING_PROVIDER_VALIDATION,
        reason:
          providerValidation.errorMessage ||
          `Stored ${config.providerName} credentials are locally valid, but provider validation has not explicitly succeeded.`,
        externalAccountId: null,
        credentialsRefPresent,
        secretPresent: true,
        requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.statusCheckError,
        errorCode: config.statusCheckErrorCode,
        details,
      });
    }
  }

  async disconnectCredentialIntegration(body, config) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, config.channel);
      if (!existing) return bad(404, { error: config.notFoundError });

      let disconnected;
      try {
        disconnected = await this.accounts.disconnect(existing.id);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: config.disconnectPersistError,
          errorCode: config.disconnectPersistErrorCode,
          details,
        });
      }

      if (!disconnected) return bad(404, { error: config.notFoundError });

      return ok({
        disconnected: true,
        channel: config.channel,
        integrationAccountId: disconnected.id,
        status: disconnected.status,
        message: config.disconnectMessage,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.unexpectedDisconnectError,
        errorCode: config.unexpectedDisconnectErrorCode,
        details,
      });
    }
  }

  getHoliduCredentialLifecycleConfig() {
    return {
      channel: "HOLIDU",
      providerName: "Holidu",
      defaultDisplayName: "Holidu",
      status: HOLIDU_STATUS,
      accountPolicy: HOLIDU_ACCOUNT_POLICY,
      credentialStore: this.holiduCredentialStore,
      normalizeCredentials: normalizeHoliduCredentials,
      hasRequiredCredentialFields: hasHoliduRequiredCredentialFields,
      summarizeRequiredFields: summarizeHoliduRequiredFields,
      normalizeProviderValidation: normalizeHoliduProviderValidation,
      buildSecretPayload: ({ credentials, connectedAt, updatedAt }) =>
        buildHoliduSecretPayload({
          credentials,
          connectedAt,
          updatedAt,
        }),
      validateProvider: (credentials) => this.holiduProviderClient.validateAccount(credentials),
      buildProviderValidationRecord: buildHoliduProviderValidationRecord,
      derivePersistedState: deriveHoliduPersistedState,
      buildCredentialSummary: buildHoliduCredentialSummary,
      getValidationMode: (validationResult) =>
        validationResult?.canValidate === false ? "PROVIDER_VALIDATION_UNAVAILABLE" : "PROVIDER_VALIDATION",
      invalidCredentialsError: "Holidu credentials must include apiKey, or both clientId and clientSecret.",
      secretStoreError: "Failed to store Holidu credentials in Secrets Manager.",
      secretStoreErrorCode: "HOLIDU_SECRET_STORE_FAILED",
      secretUpdateError: "Holidu credentials were stored, but provider validation metadata could not be persisted.",
      secretUpdateErrorCode: "HOLIDU_SECRET_UPDATE_FAILED",
      connectionPersistError: "Holidu credentials were stored, but the integration record could not be persisted.",
      connectionPersistErrorCode: "HOLIDU_CONNECTION_PERSIST_FAILED",
      unexpectedConnectError: "Unexpected Holidu connection failure.",
      unexpectedConnectErrorCode: "HOLIDU_CONNECT_FAILED",
      statusCheckError: "Failed to evaluate Holidu local connectivity state.",
      statusCheckErrorCode: "HOLIDU_STATUS_CHECK_FAILED",
      notFoundError: "Holidu integration not found",
      disconnectPersistError: "Failed to persist Holidu disconnect state in Domits.",
      disconnectPersistErrorCode: "HOLIDU_DISCONNECT_PERSIST_FAILED",
      unexpectedDisconnectError: "Unexpected Holidu disconnect failure.",
      unexpectedDisconnectErrorCode: "HOLIDU_DISCONNECT_FAILED",
      disconnectMessage:
        "Holidu integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
    };
  }

  async connectHolidu(body) {
    return this.connectCredentialIntegration(body, this.getHoliduCredentialLifecycleConfig());
  }

  async checkHoliduStatus(userId) {
    return this.checkCredentialIntegrationStatus(userId, this.getHoliduCredentialLifecycleConfig());
  }

  async disconnectHolidu(body) {
    return this.disconnectCredentialIntegration(body, this.getHoliduCredentialLifecycleConfig());
  }

  getChannexCredentialLifecycleConfig() {
    return {
      channel: "CHANNEX",
      providerName: "Channex",
      defaultDisplayName: "Channex",
      status: CHANNEX_STATUS,
      accountPolicy: CHANNEX_ACCOUNT_POLICY,
      credentialStore: this.channexCredentialStore,
      normalizeCredentials: normalizeChannexCredentials,
      hasRequiredCredentialFields: hasChannexRequiredCredentialFields,
      summarizeRequiredFields: summarizeChannexRequiredFields,
      normalizeProviderValidation: normalizeChannexProviderValidation,
      buildSecretPayload: ({ credentials, connectedAt, updatedAt }) => ({
        provider: "CHANNEX",
        credentialType: "MANUAL_CONNECT",
        ...credentials,
        connectedAt,
        updatedAt,
        providerValidation: buildDefaultChannexProviderValidation(),
      }),
      validateProvider: (credentials) => this.channexProviderClient.validateApiKey(credentials),
      buildProviderValidationRecord: buildChannexProviderValidationRecord,
      derivePersistedState: deriveChannexPersistedState,
      buildCredentialSummary: buildChannexCredentialSummary,
      getValidationMode: () => "PROVIDER_VALIDATION",
      invalidCredentialsError: "Channex credentials must include apiKey.",
      secretStoreError: "Failed to store Channex credentials in Secrets Manager.",
      secretStoreErrorCode: "CHANNEX_SECRET_STORE_FAILED",
      secretUpdateError: "Channex credentials were stored, but provider validation metadata could not be persisted.",
      secretUpdateErrorCode: "CHANNEX_SECRET_UPDATE_FAILED",
      connectionPersistError: "Channex credentials were stored, but the integration record could not be persisted.",
      connectionPersistErrorCode: "CHANNEX_CONNECTION_PERSIST_FAILED",
      unexpectedConnectError: "Unexpected Channex connection failure.",
      unexpectedConnectErrorCode: "CHANNEX_CONNECT_FAILED",
      statusCheckError: "Failed to evaluate Channex local connectivity state.",
      statusCheckErrorCode: "CHANNEX_STATUS_CHECK_FAILED",
      notFoundError: "Channex integration not found",
      disconnectPersistError: "Failed to persist Channex disconnect state in Domits.",
      disconnectPersistErrorCode: "CHANNEX_DISCONNECT_PERSIST_FAILED",
      unexpectedDisconnectError: "Unexpected Channex disconnect failure.",
      unexpectedDisconnectErrorCode: "CHANNEX_DISCONNECT_FAILED",
      disconnectMessage:
        "Channex integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
    };
  }

  async connectChannex(body) {
    return this.connectCredentialIntegration(body, this.getChannexCredentialLifecycleConfig());
  }

  async checkChannexStatus(userId) {
    return this.checkCredentialIntegrationStatus(userId, this.getChannexCredentialLifecycleConfig());
  }

  async disconnectChannex(body) {
    return this.disconnectCredentialIntegration(body, this.getChannexCredentialLifecycleConfig());
  }

  async resolveUsableChannexIntegration(
    userId,
    {
      requireSecret = false,
      missingCredentialsError = "Channex integration is not locally usable. Reconnect required.",
    } = {}
  ) {
    const integration = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
    if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
      return {
        ok: false,
        response: bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: getUnavailableChannexStatus(integration),
        }),
      };
    }

    const credentialsRef = requireStr(integration.credentialsRef);
    if (!credentialsRef) {
      return {
        ok: false,
        response: bad(409, {
          error: missingCredentialsError,
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
      };
    }

    if (!requireSecret) {
      return {
        ok: true,
        integration,
        credentialsRef,
        secret: null,
      };
    }

    let secret;
    try {
      secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    } catch (error) {
      const details = describeLocalError(error);
      return {
        ok: false,
        response: bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        }),
      };
    }

    if (
      !secret ||
      typeof secret !== "object" ||
      Array.isArray(secret) ||
      !hasChannexRequiredCredentialFields(secret)
    ) {
      return {
        ok: false,
        response: bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
      };
    }

    return {
      ok: true,
      integration,
      credentialsRef,
      secret,
    };
  }

  async listChannexProperties(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const propertyListResult = await this.channexProviderClient.listProperties(secret);
      if (!propertyListResult?.success) {
        return bad(502, {
          error: propertyListResult?.errorMessage || "Failed to fetch Channex properties.",
          errorCode: propertyListResult?.errorCode || "CHANNEX_PROPERTY_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(propertyListResult?.providerStatus),
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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const roomTypeListResult = await this.channexProviderClient.listRoomTypes(secret, normalizedExternalPropertyId);
      if (!roomTypeListResult?.success) {
        return bad(502, {
          error: roomTypeListResult?.errorMessage || "Failed to fetch Channex room types.",
          errorCode: roomTypeListResult?.errorCode || "CHANNEX_ROOM_TYPE_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(roomTypeListResult?.providerStatus),
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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const ratePlanListResult = await this.channexProviderClient.listRatePlans(secret, normalizedExternalRoomTypeId);
      if (!ratePlanListResult?.success) {
        return bad(502, {
          error: ratePlanListResult?.errorMessage || "Failed to fetch Channex rate plans.",
          errorCode: ratePlanListResult?.errorCode || "CHANNEX_RATE_PLAN_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(ratePlanListResult?.providerStatus),
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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

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
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const [propertyMappings, roomTypeMappings, ratePlanMappings] = await Promise.all([
        this.props.listByAccountId(integration.id),
        this.roomTypes.listByAccountId(integration.id),
        this.ratePlans.listByAccountId(integration.id),
      ]);

      const propertyMapping =
        (Array.isArray(propertyMappings) ? propertyMappings : []).find(
          (mapping) => mapping.domitsPropertyId === normalizedDomitsPropertyId
        ) || null;
      const selectedExternalPropertyId = requireStr(propertyMapping?.externalPropertyId);
      const propertyScopedRoomTypeMappings = (Array.isArray(roomTypeMappings) ? roomTypeMappings : []).filter(
        (mapping) =>
          mapping.domitsPropertyId === normalizedDomitsPropertyId &&
          selectedExternalPropertyId &&
          mapping.externalPropertyId === selectedExternalPropertyId
      );
      const propertyScopedRatePlanMappings = (Array.isArray(ratePlanMappings) ? ratePlanMappings : []).filter(
        (mapping) =>
          mapping.domitsPropertyId === normalizedDomitsPropertyId &&
          selectedExternalPropertyId &&
          mapping.externalPropertyId === selectedExternalPropertyId
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

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

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

      const normalizedAvailabilityWindows = normalizeAvailabilityWindows(availabilityWindows);
      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
      const restrictionMapping = buildChannexRestrictionMapping(normalizedRestrictions);

      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const calendarRestrictionOverrideDates = Array.from(overrideMap.values()).filter(
        (override) => buildCalendarRestrictionOverrideSummary(override).hasAnyValue
      ).length;
      const {
        availabilityPreview,
        rateRestrictionPreview,
        supportedCalendarRestrictionOverrideFields,
        effectiveChannexRestrictionFields,
      } = buildAriPreviewCollections({
        dates,
        overrideMap,
        restrictionMapping,
        normalizedAvailabilityWindows,
        pricing,
        readiness,
        normalizedDomitsPropertyId,
        normalizedRestrictions,
      });

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
          supportedAvailabilityRestrictions: restrictionMapping.supportedRestrictions.length,
          globalSupportedChannexRestrictionFields: restrictionMapping.supportedChannexRestrictionFields,
          calendarRestrictionOverrides: calendarRestrictionOverrideDates,
          supportedCalendarRestrictionOverrideFields: Array.from(supportedCalendarRestrictionOverrideFields).sort(compareAlphabetically),
          supportedChannexRestrictionFields: Array.from(effectiveChannexRestrictionFields).sort(compareAlphabetically),
          omittedAvailabilityRestrictions: restrictionMapping.omittedRestrictions.length,
          omittedDomitsRestrictionNames: restrictionMapping.omittedDomitsRestrictionNames,
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

    const validationResponse = buildPreviewDateRangeValidationResponse({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationResponse) return validationResponse;

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
      const notes = createChannexAriPayloadPreviewNotes();

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

      appendChannexAriPayloadPreviewNotes(notes, preview);

      const availabilityItems = (Array.isArray(preview.availabilityPreview) ? preview.availabilityPreview : []).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        date: item.date,
        availability: item.availability,
      }));
      const availabilityPayloadGroups = buildAvailabilityPayloadGroups(availabilityItems);

      const restrictionRateItems = buildRestrictionRateItems(preview.rateRestrictionPreview);
      const restrictionRatePayloadGroups = buildRestrictionRatePayloadGroups(restrictionRateItems);

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

  formatChannexEvidenceRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      channel: row.channel,
      provider: row.provider,
      integrationAccountId: row.integrationAccountId ?? null,
      domitsPropertyId: row.domitsPropertyId ?? null,
      syncType: row.syncType,
      dateFrom: row.dateFrom ?? null,
      dateTo: row.dateTo ?? null,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
      status: row.status,
      overallSuccess: !!row.overallSuccess,
      mappingSnapshot: parseStructuredEvidenceField(row.mappingSnapshot),
      groupedOutboundPayloadSnapshot: parseStructuredEvidenceField(row.groupedOutboundPayloadSnapshot),
      providerResponseSummary: parseStructuredEvidenceField(row.providerResponseSummary),
      taskIds: parseStructuredEvidenceField(row.taskIds) ?? [],
      warnings: parseStructuredEvidenceField(row.warnings) ?? [],
      errors: parseStructuredEvidenceField(row.errors) ?? [],
      notes: parseStructuredEvidenceField(row.notes) ?? [],
      rawDetails: parseStructuredEvidenceField(row.rawDetails),
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  }

  formatChannexEvidenceLatestSummary(row) {
    const formatted = this.formatChannexEvidenceRow(row);
    if (!formatted) return null;

    const providerSummary =
      formatted.providerResponseSummary && typeof formatted.providerResponseSummary === "object"
        ? formatted.providerResponseSummary
        : null;
    const requestCount = Number(providerSummary?.requestCount);
    const providerCalled = getProviderCalledFromEvidenceSummary(providerSummary, requestCount);
    const notes = Array.isArray(formatted.notes) ? formatted.notes.filter(Boolean) : [];

    return {
      id: formatted.id,
      syncType: formatted.syncType,
      status: formatted.status,
      overallSuccess: formatted.overallSuccess,
      startedAt: formatted.startedAt,
      finishedAt: formatted.finishedAt,
      dateFrom: formatted.dateFrom,
      dateTo: formatted.dateTo,
      taskIds: Array.isArray(formatted.taskIds) ? formatted.taskIds : [],
      warningCount: Array.isArray(formatted.warnings) ? formatted.warnings.length : 0,
      errorCount: Array.isArray(formatted.errors) ? formatted.errors.length : 0,
      providerCalled,
      notesSummary: notes.length ? notes.slice(0, 3) : [],
    };
  }

  async persistChannexSyncEvidence({
    userId,
    integrationAccountId,
    domitsPropertyId,
    syncType,
    dateFrom,
    dateTo,
    startedAt,
    finishedAt,
    status,
    overallSuccess,
    mappingSnapshot,
    groupedOutboundPayloadSnapshot,
    providerResponseSummary,
    taskIds,
    warnings,
    errors,
    notes,
    rawDetails,
  }) {
    try {
      let resolvedIntegrationAccountId = requireStr(integrationAccountId);
      if (!resolvedIntegrationAccountId && requireStr(userId)) {
        const integration = await this.accounts.findByUserIdAndChannel(requireStr(userId), "CHANNEX");
        resolvedIntegrationAccountId = requireStr(integration?.id);
      }

      if (!resolvedIntegrationAccountId) {
        return {
          evidenceId: null,
          evidencePersisted: false,
          evidenceSkipped: true,
          evidenceSkipReason: "CHANNEX_INTEGRATION_ACCOUNT_UNRESOLVED",
          evidenceError: null,
        };
      }

      const finishedAtMs = Number.isFinite(Number(finishedAt)) ? Number(finishedAt) : nowMs();
      const startedAtMs = Number.isFinite(Number(startedAt)) ? Number(startedAt) : finishedAtMs;
      const row = {
        id: randomUUID(),
        channel: "CHANNEX",
        provider: "CHANNEX",
        integrationAccountId: resolvedIntegrationAccountId ?? null,
        domitsPropertyId: requireStr(domitsPropertyId) ?? null,
        syncType: requireStr(syncType) ?? "ari",
        dateFrom: parseIsoDateParam(dateFrom) ?? null,
        dateTo: parseIsoDateParam(dateTo) ?? null,
        startedAt: startedAtMs,
        finishedAt: finishedAtMs,
        status: requireStr(status) ?? "FAILED",
        overallSuccess: !!overallSuccess,
        mappingSnapshot: stringifyJsonOrNull(mappingSnapshot),
        groupedOutboundPayloadSnapshot: stringifyJsonOrNull(groupedOutboundPayloadSnapshot),
        providerResponseSummary: stringifyJsonOrNull(providerResponseSummary),
        taskIds: stringifyJsonOrNull(Array.isArray(taskIds) ? taskIds : []),
        warnings: stringifyJsonOrNull(Array.isArray(warnings) ? warnings : []),
        errors: stringifyJsonOrNull(Array.isArray(errors) ? errors : []),
        notes: stringifyJsonOrNull(Array.isArray(notes) ? notes : []),
        rawDetails: stringifyJsonOrNull(rawDetails),
        createdAt: finishedAtMs,
        updatedAt: finishedAtMs,
      };

      await this.channexEvidence.create(row);
      return {
        evidenceId: row.id,
        evidencePersisted: true,
        evidenceSkipped: false,
        evidenceSkipReason: null,
        evidenceError: null,
      };
    } catch (error) {
      return {
        evidenceId: null,
        evidencePersisted: false,
        evidenceSkipped: false,
        evidenceSkipReason: null,
        evidenceError: describeLocalError(error),
      };
    }
  }

  async finalizeChannexSyncResult(
    result,
    evidenceInput,
    { skipEvidence = false, includeEvidenceMetadata = true } = {}
  ) {
    if (skipEvidence) return result;

    const evidenceMeta = await this.persistChannexSyncEvidence(evidenceInput);
    if (!includeEvidenceMetadata) return result;

    const response =
      result?.response && typeof result.response === "object" && !Array.isArray(result.response)
        ? { ...result.response }
        : { value: result?.response ?? null };

    response.evidenceId = evidenceMeta.evidenceId;
    response.evidencePersisted = evidenceMeta.evidencePersisted;
    response.evidenceSkipped = !!evidenceMeta.evidenceSkipped;
    if (evidenceMeta.evidenceSkipReason) {
      response.evidenceSkipReason = evidenceMeta.evidenceSkipReason;
    }
    if (evidenceMeta.evidenceError) {
      response.evidenceError = evidenceMeta.evidenceError;
    }

    return {
      ...result,
      response,
    };
  }

  async listChannexSyncEvidence(
    userId,
    { integrationAccountId, domitsPropertyId, syncType, status, dateFrom, dateTo, limit } = {}
  ) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const requestedIntegrationAccountId = requireStr(integrationAccountId);
      if (requestedIntegrationAccountId && requestedIntegrationAccountId !== integration.id) {
        return bad(404, {
          error: "Requested Channex evidence does not belong to this user.",
          errorCode: "CHANNEX_EVIDENCE_NOT_FOUND",
        });
      }

      const numericLimit = Number(limit);
      const safeLimit = Number.isFinite(numericLimit) ? Math.min(Math.max(Math.trunc(numericLimit), 1), 200) : 50;
      const normalizedStatus = requireStr(status);
      const dateFilters = normalizeEvidenceDateFilters(dateFrom, dateTo);
      if (dateFilters.error) return dateFilters.error;

      const rows = await this.channexEvidence.listByFilters({
        integrationAccountId: integration.id,
        domitsPropertyId: requireStr(domitsPropertyId),
        syncType: requireStr(syncType),
        status: normalizedStatus,
        dateFrom: dateFilters.parsedDateFrom,
        dateTo: dateFilters.parsedDateTo,
        limit: safeLimit,
      });

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: requireStr(domitsPropertyId) ?? null,
        syncType: requireStr(syncType) ?? null,
        status: normalizedStatus ?? null,
        dateFrom: dateFilters.parsedDateFrom,
        dateTo: dateFilters.parsedDateTo,
        limit: safeLimit,
        items: (Array.isArray(rows) ? rows : []).map((row) => this.formatChannexEvidenceRow(row)),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex sync evidence.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_LIST_FAILED",
        details,
      });
    }
  }

  async getChannexSyncEvidence(userId, evidenceId) {
    const normalizedUserId = requireStr(userId);
    const normalizedEvidenceId = requireStr(evidenceId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedEvidenceId) return bad(400, { error: "Missing required path param: evidenceId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const row = await this.channexEvidence.getByIdAndIntegrationAccountId(normalizedEvidenceId, integration.id);
      if (!row) {
        return bad(404, {
          error: "Requested Channex sync evidence was not found.",
          errorCode: "CHANNEX_SYNC_EVIDENCE_NOT_FOUND",
        });
      }

      return ok({
        item: this.formatChannexEvidenceRow(row),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get Channex sync evidence.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_GET_FAILED",
        details,
      });
    }
  }

  async getLatestChannexSyncEvidenceSummary(userId, domitsPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) return bad(400, { error: "Missing required query param: domitsPropertyId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const rows = await this.channexEvidence.listByFilters({
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        limit: 1,
      });
      const latest = Array.isArray(rows) && rows.length ? rows[0] : null;

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        item: this.formatChannexEvidenceLatestSummary(latest),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get latest Channex sync evidence summary.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_LATEST_FAILED",
        details,
      });
    }
  }

  formatChannexBookingRevisionSummary(revision) {
    if (!revision || typeof revision !== "object") return null;

    return {
      revisionId: requireStr(revision.revisionId),
      bookingId: requireStr(revision.bookingId),
      externalPropertyId: requireStr(revision.propertyId),
      externalRoomTypeId: requireStr(revision.roomTypeId),
      externalRatePlanId: requireStr(revision.ratePlanId),
      status: requireStr(revision.status),
      arrivalDate: parseIsoDateParam(revision.arrivalDate) ?? null,
      departureDate: parseIsoDateParam(revision.departureDate) ?? null,
      guestName: requireStr(revision.guestName),
      amount: revision.amount ?? null,
      currency: requireStr(revision.currency),
      insertedAt: requireStr(revision.insertedAt),
    };
  }

  buildChannexBookingMappingSnapshot(propertyMapping) {
    const normalizedPropertyMapping = propertyMapping && typeof propertyMapping === "object" ? propertyMapping : null;

    return {
      propertyMapping: normalizedPropertyMapping
        ? {
            domitsPropertyId: normalizedPropertyMapping.domitsPropertyId ?? null,
            externalPropertyId: normalizedPropertyMapping.externalPropertyId ?? null,
            externalPropertyName: normalizedPropertyMapping.externalPropertyName ?? null,
            status: normalizedPropertyMapping.status ?? null,
          }
        : null,
    };
  }

  async resolveChannexBookingContext(userId, domitsPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    const buildFailure = ({
      statusCode,
      error,
      errorCode,
      integrationAccountId = null,
      propertyMapping = null,
      details = null,
    }) => ({
      ok: false,
      result: bad(statusCode, {
        error,
        errorCode,
        ...withOptionalDetails({}, details),
      }),
      evidencePatch: {
        integrationAccountId,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot: this.buildChannexBookingMappingSnapshot(propertyMapping),
        errors: [
          withOptionalDetails({ errorCode, errorMessage: error }, details),
        ],
        rawDetails: {
          propertyMapping: propertyMapping
            ? {
                domitsPropertyId: propertyMapping.domitsPropertyId ?? null,
                externalPropertyId: propertyMapping.externalPropertyId ?? null,
              }
            : null,
        },
      },
    });

    const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
    if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
      return buildFailure({
        statusCode: 409,
        error: "Channex integration is not connected for this user.",
        errorCode: "CHANNEX_NOT_CONNECTED",
        integrationAccountId: integration?.id ?? null,
      });
    }

    const propertyMappings = await this.props.listByAccountId(integration.id);
    const propertyMapping = (Array.isArray(propertyMappings) ? propertyMappings : []).find(
      (mapping) => requireStr(mapping?.domitsPropertyId) === normalizedDomitsPropertyId
    );
    if (!propertyMapping || !requireStr(propertyMapping.externalPropertyId)) {
      return buildFailure({
        statusCode: 409,
        error: "Current Channex property mapping is missing for this Domits property.",
        errorCode: "CHANNEX_PROPERTY_MAPPING_MISSING",
        integrationAccountId: integration.id,
      });
    }

    const credentialsRef = requireStr(integration.credentialsRef);
    if (!credentialsRef) {
      return buildFailure({
        statusCode: 409,
        error: "Channex credentials are missing. Reconnect required.",
        errorCode: "CHANNEX_RECONNECT_REQUIRED",
        integrationAccountId: integration.id,
        propertyMapping,
      });
    }

    let secret;
    try {
      secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    } catch (error) {
      const details = describeLocalError(error);
      return buildFailure({
        statusCode: 409,
        error: "Stored Channex secret could not be read. Reconnect required.",
        errorCode: "CHANNEX_SECRET_READ_FAILED",
        integrationAccountId: integration.id,
        propertyMapping,
        details,
      });
    }

    if (
      !secret ||
      typeof secret !== "object" ||
      Array.isArray(secret) ||
      !hasChannexRequiredCredentialFields(secret)
    ) {
      return buildFailure({
        statusCode: 409,
        error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
        errorCode: "CHANNEX_SECRET_INVALID",
        integrationAccountId: integration.id,
        propertyMapping,
      });
    }

    return {
      ok: true,
      integration,
      propertyMapping,
      secret,
    };
  }

  formatPersistedChannexBookingRevision(row, { includeRawPayload = false } = {}) {
    if (!row || typeof row !== "object") return null;

    const formatted = {
      id: row.id,
      integrationAccountId: row.integrationAccountId ?? null,
      domitsPropertyId: row.domitsPropertyId ?? null,
      externalPropertyId: row.externalPropertyId ?? null,
      externalReservationId: row.externalReservationId ?? null,
      revisionId: row.revisionId ?? null,
      bookingStatus: row.bookingStatus ?? null,
      arrivalDate: parseIsoDateParam(row.arrivalDate) ?? null,
      departureDate: parseIsoDateParam(row.departureDate) ?? null,
      guestSummary: row.guestSummary ?? null,
      acknowledgementState: row.acknowledgementState ?? null,
      acknowledgedAt: row.acknowledgedAt ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
    };

    if (includeRawPayload) {
      formatted.rawPayload = parseStructuredEvidenceField(row.rawPayload);
    }

    return formatted;
  }

  isScopedChannexBookingRevisionRow(row, integrationAccountId, domitsPropertyId) {
    if (!row || typeof row !== "object") return false;

    return (
      requireStr(row.integrationAccountId) === integrationAccountId &&
      requireStr(row.domitsPropertyId) === domitsPropertyId
    );
  }

  async listChannexBookingRevisions(
    userId,
    { domitsPropertyId, limit, includeRawPayload = false } = {}
  ) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const safeLimit = normalizePositiveLimit(
        limit,
        CHANNEX_BOOKING_REVISION_LIST_DEFAULT_LIMIT,
        CHANNEX_BOOKING_REVISION_LIST_MAX_LIMIT
      );
      const rows = await this.channexBookingRevisions.listByFilters({
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        limit: safeLimit,
      });
      const scopedRows = (Array.isArray(rows) ? rows : []).filter((row) =>
        this.isScopedChannexBookingRevisionRow(row, integration.id, normalizedDomitsPropertyId)
      );
      const revisions = scopedRows
        .map((row) => this.formatPersistedChannexBookingRevision(row, { includeRawPayload }))
        .filter(Boolean);

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        limit: safeLimit,
        count: revisions.length,
        includeRawPayload: includeRawPayload === true,
        revisions,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex booking revisions.",
        errorCode: "CHANNEX_BOOKING_REVISION_LIST_FAILED",
        details,
      });
    }
  }

  async persistChannexBookingRevision({
    integrationAccountId,
    domitsPropertyId,
    propertyMapping,
    revision,
  }) {
    const externalReservationId =
      requireStr(revision?.bookingId) ||
      requireStr(revision?.uniqueId) ||
      requireStr(revision?.systemId) ||
      requireStr(revision?.revisionId);

    if (!externalReservationId) {
      const error = new Error("Channex booking revision is missing a stable reservation identifier.");
      error.code = "CHANNEX_BOOKING_RESERVATION_ID_MISSING";
      throw error;
    }

    const existing = await this.channexBookingRevisions.getByIntegrationAccountIdAndRevisionId(
      integrationAccountId,
      requireStr(revision?.revisionId)
    );
    const saved = await this.channexBookingRevisions.upsert({
      integrationAccountId,
      domitsPropertyId,
      externalPropertyId: requireStr(propertyMapping?.externalPropertyId),
      externalReservationId,
      revisionId: requireStr(revision?.revisionId),
      bookingStatus: requireStr(revision?.status) ?? null,
      arrivalDate: parseIsoDateParam(revision?.arrivalDate) ?? null,
      departureDate: parseIsoDateParam(revision?.departureDate) ?? null,
      guestSummary: requireStr(revision?.guestName) ?? null,
      rawPayload: serializeRawPayload({
        provider: "CHANNEX",
        externalPropertyId: requireStr(propertyMapping?.externalPropertyId) ?? null,
        revisionId: requireStr(revision?.revisionId) ?? null,
        bookingId: requireStr(revision?.bookingId) ?? null,
        persistedAt: nowMs(),
        payload: revision?.rawPayload ?? revision ?? null,
      }),
      acknowledgementState: existing?.acknowledgementState ?? "RECEIVED",
      acknowledgedAt: existing?.acknowledgedAt ?? null,
    });

    return this.formatPersistedChannexBookingRevision(saved);
  }

  buildChannexBookingProviderFeedFailure({ integration, providerResult, mappingSnapshot, notes }) {
    const response = bad(502, {
      error: "Failed to fetch Channex booking revision feed.",
      errorCode: providerResult?.errorCode ?? "CHANNEX_BOOKING_FEED_FAILED",
      providerStatus: providerResult?.providerStatus ?? null,
      details: providerResult?.errorMessage ?? null,
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: integration.id,
        status: "FAILED",
        overallSuccess: false,
        mappingSnapshot,
        providerResponseSummary: {
          calledProvider: true,
          providerStatus: providerResult?.providerStatus ?? null,
          fetchedCount: 0,
          persistedCount: 0,
          failedCount: 1,
        },
        errors: [
          {
            errorCode: providerResult?.errorCode ?? "CHANNEX_BOOKING_FEED_FAILED",
            errorMessage: providerResult?.errorMessage ?? "Failed to fetch Channex booking revision feed.",
            providerStatus: providerResult?.providerStatus ?? null,
          },
        ],
        notes,
        rawDetails: {
          providerResult,
          propertyMapping: mappingSnapshot.propertyMapping,
        },
      },
    };
  }

  buildChannexBookingScopeFailure(revisionSummary, revisionId = revisionSummary?.revisionId ?? null) {
    return {
      revisionId,
      stage: "scope",
      errorCode: "CHANNEX_BOOKING_PROPERTY_SCOPE_MISMATCH",
      errorMessage: "Fetched booking revision does not belong to the currently selected Channex property mapping.",
      externalPropertyId: revisionSummary?.externalPropertyId ?? null,
    };
  }

  isChannexBookingRevisionInPropertyScope(revision, propertyMapping) {
    const revisionPropertyId = requireStr(revision?.propertyId);
    if (revisionPropertyId) {
      return revisionPropertyId === requireStr(propertyMapping?.externalPropertyId);
    }
    return true;
  }

  async collectChannexBookingRevisionFeed({ providerResult, integration, normalizedDomitsPropertyId, propertyMapping }) {
    const fetched = [];
    const persisted = [];
    const failed = [];

    for (const revision of Array.isArray(providerResult.revisions) ? providerResult.revisions : []) {
      const revisionSummary = this.formatChannexBookingRevisionSummary(revision);
      fetched.push(revisionSummary);

      if (!this.isChannexBookingRevisionInPropertyScope(revision, propertyMapping)) {
        failed.push(this.buildChannexBookingScopeFailure(revisionSummary));
        continue;
      }

      try {
        persisted.push(
          await this.persistChannexBookingRevision({
            integrationAccountId: integration.id,
            domitsPropertyId: normalizedDomitsPropertyId,
            propertyMapping,
            revision,
          })
        );
      } catch (error) {
        failed.push({
          revisionId: revisionSummary?.revisionId ?? null,
          stage: "persist",
          errorCode: error?.code || "CHANNEX_BOOKING_PERSIST_FAILED",
          errorMessage: error?.message || "Failed to persist Channex booking revision.",
        });
      }
    }

    return { fetched, persisted, failed };
  }

  buildChannexBookingFetchFailure(revisionId, fetchResult) {
    return {
      revisionId,
      stage: "fetch",
      errorCode: fetchResult?.errorCode ?? "CHANNEX_BOOKING_REVISION_FETCH_FAILED",
      errorMessage: fetchResult?.errorMessage ?? "Failed to fetch Channex booking revision.",
      providerStatus: fetchResult?.providerStatus ?? null,
    };
  }

  buildChannexBookingAckFailure(revisionId, ackResult) {
    return {
      revisionId,
      stage: "ack",
      errorCode: ackResult?.errorCode ?? "CHANNEX_BOOKING_ACK_FAILED",
      errorMessage: ackResult?.errorMessage ?? "Failed to acknowledge Channex booking revision.",
      providerStatus: ackResult?.providerStatus ?? null,
    };
  }

  async tryPersistChannexBookingRevision({ integration, normalizedDomitsPropertyId, propertyMapping, revision, revisionId }) {
    try {
      const persisted = await this.persistChannexBookingRevision({
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        propertyMapping,
        revision,
      });
      return { persisted, failure: null };
    } catch (error) {
      return {
        persisted: null,
        failure: {
          revisionId,
          stage: "persist",
          errorCode: error?.code || "CHANNEX_BOOKING_PERSIST_FAILED",
          errorMessage: error?.message || "Failed to persist Channex booking revision.",
        },
      };
    }
  }

  async processChannexBookingAcknowledgement({ revisionId, secret, integration, normalizedDomitsPropertyId, propertyMapping }) {
    const fetchResult = await this.channexProviderClient.getBookingRevision(secret, revisionId);
    if (!fetchResult?.success || !fetchResult?.revision) {
      return { fetched: null, persisted: null, acknowledged: null, failure: this.buildChannexBookingFetchFailure(revisionId, fetchResult) };
    }

    const revision = fetchResult.revision;
    const revisionSummary = this.formatChannexBookingRevisionSummary(revision);
    if (!this.isChannexBookingRevisionInPropertyScope(revision, propertyMapping)) {
      return {
        fetched: revisionSummary,
        persisted: null,
        acknowledged: null,
        failure: this.buildChannexBookingScopeFailure(revisionSummary, revisionId),
      };
    }

    const persistResult = await this.tryPersistChannexBookingRevision({
      integration,
      normalizedDomitsPropertyId,
      propertyMapping,
      revision,
      revisionId,
    });
    if (persistResult.failure) {
      return { fetched: revisionSummary, persisted: null, acknowledged: null, failure: persistResult.failure };
    }

    const latestPersisted = persistResult.persisted;
    if (latestPersisted?.acknowledgementState === "ACKNOWLEDGED") {
      return {
        fetched: revisionSummary,
        persisted: latestPersisted,
        acknowledged: {
          revisionId,
          providerStatus: "ALREADY_ACKNOWLEDGED_LOCALLY",
          acknowledgedAt: latestPersisted.acknowledgedAt ?? null,
        },
        failure: null,
      };
    }

    const ackResult = await this.channexProviderClient.acknowledgeBookingRevision(secret, revisionId);
    if (!ackResult?.success) {
      return {
        fetched: revisionSummary,
        persisted: latestPersisted,
        acknowledged: null,
        failure: this.buildChannexBookingAckFailure(revisionId, ackResult),
      };
    }

    const acknowledgedRow = await this.channexBookingRevisions.markAcknowledged(
      integration.id,
      revisionId,
      nowMs()
    );
    return {
      fetched: revisionSummary,
      persisted: latestPersisted,
      acknowledged: {
        revisionId,
        providerStatus: ackResult?.providerStatus ?? null,
        acknowledgedAt: acknowledgedRow?.acknowledgedAt ?? null,
      },
      failure: null,
    };
  }

  async collectChannexBookingAcknowledgements({ revisionIds, secret, integration, normalizedDomitsPropertyId, propertyMapping }) {
    const fetched = [];
    const persisted = [];
    const acknowledged = [];
    const failed = [];

    for (const revisionId of revisionIds) {
      const result = await this.processChannexBookingAcknowledgement({
        revisionId,
        secret,
        integration,
        normalizedDomitsPropertyId,
        propertyMapping,
      });
      if (result.fetched) fetched.push(result.fetched);
      if (result.persisted) persisted.push(result.persisted);
      if (result.acknowledged) acknowledged.push(result.acknowledged);
      if (result.failure) failed.push(result.failure);
    }

    return { fetched, persisted, acknowledged, failed };
  }

  async receiveChannexBookingRevisions(userId, domitsPropertyId, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: "booking_receive",
          dateFrom: null,
          dateTo: null,
          startedAt,
          evidencePatch,
        }),
        options
      );

    if (!normalizedUserId) {
      return await finalize(bad(400, { error: "Missing required query param: userId" }), {
        status: "INVALID_REQUEST",
        errors: [{ errorCode: "MISSING_USER_ID", errorMessage: "Missing required query param: userId" }],
      });
    }
    if (!normalizedDomitsPropertyId) {
      return await finalize(bad(400, { error: "Missing required query param: domitsPropertyId" }), {
        status: "INVALID_REQUEST",
        errors: [
          {
            errorCode: "MISSING_DOMITS_PROPERTY_ID",
            errorMessage: "Missing required query param: domitsPropertyId",
          },
        ],
      });
    }

    try {
      const context = await this.resolveChannexBookingContext(normalizedUserId, normalizedDomitsPropertyId);
      if (!context.ok) {
        return await finalize(context.result, {
          ...context.evidencePatch,
          notes: [
            "Manual staging booking receive only. This endpoint fetches Channex booking revisions for the currently selected property mapping and persists raw payloads into channex_booking_revision.",
            "Acknowledgement is intentionally separate in this certification-prep slice and is not performed by this receive endpoint.",
          ],
        });
      }

      const { integration, propertyMapping, secret } = context;
      const mappingSnapshot = this.buildChannexBookingMappingSnapshot(propertyMapping);
      const notes = [
        "Manual staging booking receive only. This endpoint fetches Channex booking revisions for the currently selected property mapping and persists raw payloads into channex_booking_revision.",
        "Acknowledgement is intentionally separate in this certification-prep slice and is not performed by this receive endpoint.",
        "This slice stores raw inbound booking revision payloads for reviewability but does not yet create or reconcile Domits booking-domain records.",
      ];

      const providerResult = await this.channexProviderClient.listBookingRevisionFeed(secret, {
        externalPropertyId: propertyMapping.externalPropertyId,
      });
      if (!providerResult?.success) {
        const failure = this.buildChannexBookingProviderFeedFailure({
          integration,
          providerResult,
          mappingSnapshot,
          notes,
        });
        return await finalize(failure.response, failure.evidencePatch);
      }

      const { fetched, persisted, failed } = await this.collectChannexBookingRevisionFeed({
        providerResult,
        integration,
        normalizedDomitsPropertyId,
        propertyMapping,
      });

      const overallSuccess = failed.length === 0;
      const status = getBookingReceiveStatus({ fetched, persisted, failed });
      const response = ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        externalPropertyId: propertyMapping.externalPropertyId,
        calledProvider: true,
        fetchedCount: fetched.length,
        persistedCount: persisted.length,
        acknowledgedCount: 0,
        failedCount: failed.length,
        fetched,
        persisted,
        acknowledged: [],
        failed,
        overallSuccess,
        notes:
          fetched.length === 0
            ? [...notes, "No booking revisions were returned for the currently selected Channex property."]
            : notes,
      });

      return await finalize(response, {
        integrationAccountId: integration.id,
        status,
        overallSuccess,
        mappingSnapshot,
        providerResponseSummary: {
          calledProvider: true,
          providerStatus: providerResult?.providerStatus ?? null,
          fetchedCount: fetched.length,
          persistedCount: persisted.length,
          acknowledgedCount: 0,
          failedCount: failed.length,
        },
        errors: failed,
        notes: response.response.notes,
        rawDetails: {
          fetched,
          persisted,
          failed,
          providerStatus: providerResult?.providerStatus ?? null,
          propertyMapping: mappingSnapshot.propertyMapping,
        },
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to receive Channex booking revisions.",
          errorCode: "CHANNEX_BOOKING_RECEIVE_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_BOOKING_RECEIVE_FAILED",
              errorMessage: "Failed to receive Channex booking revisions.",
              details,
            },
          ],
          rawDetails: { caughtError: details },
        }
      );
    }
  }

  async acknowledgeChannexBookingRevisions(userId, domitsPropertyId, body = {}, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const revisionIds = uniqueBy(
      Array.isArray(body?.revisionIds) ? body.revisionIds.map((item) => requireStr(item)).filter(Boolean) : [],
      (item) => item
    );
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: "booking_ack",
          dateFrom: null,
          dateTo: null,
          startedAt,
          evidencePatch,
        }),
        options
      );

    if (!normalizedUserId) {
      return await finalize(bad(400, { error: "Missing required query param: userId" }), {
        status: "INVALID_REQUEST",
        errors: [{ errorCode: "MISSING_USER_ID", errorMessage: "Missing required query param: userId" }],
      });
    }
    if (!normalizedDomitsPropertyId) {
      return await finalize(bad(400, { error: "Missing required query param: domitsPropertyId" }), {
        status: "INVALID_REQUEST",
        errors: [
          {
            errorCode: "MISSING_DOMITS_PROPERTY_ID",
            errorMessage: "Missing required query param: domitsPropertyId",
          },
        ],
      });
    }
    if (!revisionIds.length) {
      return await finalize(bad(400, { error: "Missing required body field: revisionIds[]" }), {
        status: "INVALID_REQUEST",
        errors: [
          {
            errorCode: "MISSING_REVISION_IDS",
            errorMessage: "Missing required body field: revisionIds[]",
          },
        ],
      });
    }

    try {
      const context = await this.resolveChannexBookingContext(normalizedUserId, normalizedDomitsPropertyId);
      if (!context.ok) {
        return await finalize(context.result, {
          ...context.evidencePatch,
          notes: [
            "Manual staging booking acknowledgement only. This endpoint re-fetches each requested Channex revision, persists the raw payload into channex_booking_revision, and only then attempts provider acknowledgement.",
            "Acknowledgement is never attempted for revisions that fail fetch, fall outside the currently selected property mapping, or fail persistence.",
          ],
        });
      }

      const { integration, propertyMapping, secret } = context;
      const mappingSnapshot = this.buildChannexBookingMappingSnapshot(propertyMapping);
      const notes = [
        "Manual staging booking acknowledgement only. This endpoint re-fetches each requested Channex revision, persists the raw payload into channex_booking_revision, and only then attempts provider acknowledgement.",
        "Acknowledgement is never attempted for revisions that fail fetch, fall outside the currently selected property mapping, or fail persistence.",
        "This slice does not yet build or reconcile Domits booking-domain records from the received Channex payloads.",
      ];

      const { fetched, persisted, acknowledged, failed } = await this.collectChannexBookingAcknowledgements({
        revisionIds,
        secret,
        integration,
        normalizedDomitsPropertyId,
        propertyMapping,
      });

      const overallSuccess = failed.length === 0 && acknowledged.length === revisionIds.length;
      const status = getBookingAcknowledgementStatus({ overallSuccess, acknowledged });
      const response = ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        externalPropertyId: propertyMapping.externalPropertyId,
        calledProvider: true,
        requestedRevisionIds: revisionIds,
        fetchedCount: fetched.length,
        persistedCount: persisted.length,
        acknowledgedCount: acknowledged.length,
        failedCount: failed.length,
        fetched,
        persisted,
        acknowledged,
        failed,
        overallSuccess,
        notes,
      });

      return await finalize(response, {
        integrationAccountId: integration.id,
        status,
        overallSuccess,
        mappingSnapshot,
        providerResponseSummary: {
          calledProvider: true,
          requestedCount: revisionIds.length,
          fetchedCount: fetched.length,
          persistedCount: persisted.length,
          acknowledgedCount: acknowledged.length,
          failedCount: failed.length,
        },
        errors: failed,
        notes,
        rawDetails: {
          requestedRevisionIds: revisionIds,
          fetched,
          persisted,
          acknowledged,
          failed,
          propertyMapping: mappingSnapshot.propertyMapping,
        },
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to acknowledge Channex booking revisions.",
          errorCode: "CHANNEX_BOOKING_ACK_RUN_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_BOOKING_ACK_RUN_FAILED",
              errorMessage: "Failed to acknowledge Channex booking revisions.",
              details,
            },
          ],
          rawDetails: { caughtError: details },
        }
      );
    }
  }

  buildChannexSyncCredentialFailure({
    response,
    integrationAccountId,
    mappingSnapshot,
    groupedPayloads,
    baseNotes,
    payloadPreview,
    errorCode,
    errorMessage,
    details = null,
  }) {
    return {
      ok: false,
      response,
      evidencePatch: {
        integrationAccountId,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: groupedPayloads,
        providerResponseSummary: { ready: true, calledProvider: false, results: [] },
        errors: [
          withOptionalDetails({ errorCode, errorMessage }, details),
        ],
        notes: baseNotes,
        rawDetails: { payloadPreview },
      },
    };
  }

  async resolveChannexSyncCredentialContext({
    userId,
    mappingSnapshot,
    groupedPayloads,
    baseNotes,
    payloadPreview,
  }) {
    const integration = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
    if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: getUnavailableChannexStatus(integration),
        }),
        integrationAccountId: integration?.id ?? null,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_NOT_CONNECTED",
        errorMessage: "Channex integration is not connected for this user.",
      });
    }

    const credentialsRef = requireStr(integration.credentialsRef);
    if (!credentialsRef) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Channex credentials are missing. Reconnect required.",
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_RECONNECT_REQUIRED",
        errorMessage: "Channex credentials are missing. Reconnect required.",
      });
    }

    let secret;
    try {
      secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    } catch (error) {
      const details = describeLocalError(error);
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_SECRET_READ_FAILED",
        errorMessage: "Stored Channex secret could not be read. Reconnect required.",
        details,
      });
    }

    if (
      !secret ||
      typeof secret !== "object" ||
      Array.isArray(secret) ||
      !hasChannexRequiredCredentialFields(secret)
    ) {
      return this.buildChannexSyncCredentialFailure({
        response: bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
        integrationAccountId: integration.id,
        mappingSnapshot,
        groupedPayloads,
        baseNotes,
        payloadPreview,
        errorCode: "CHANNEX_SECRET_INVALID",
        errorMessage: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
      });
    }

    return {
      ok: true,
      integration,
      secret,
    };
  }

  createChannexSyncFinalizer({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    rawDateFrom,
    rawDateTo,
    startedAt,
    syncType,
    options,
  }) {
    return async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType,
          dateFrom: normalizedDateFrom ?? requireStr(rawDateFrom),
          dateTo: normalizedDateTo ?? requireStr(rawDateTo),
          startedAt,
          evidencePatch,
        }),
        options
      );
  }

  buildChannexSyncPreviewFailureEvidencePatch(payloadPreviewResult, config) {
    const previewResponse = payloadPreviewResult?.response || {};
    return {
      status: getInvalidRequestOrFailedStatus(payloadPreviewResult?.statusCode),
      overallSuccess: false,
      mappingSnapshot: {
        missingMappings: Array.isArray(previewResponse.missingMappings) ? previewResponse.missingMappings : [],
        sourceSummary: previewResponse.sourceSummary ?? null,
      },
      groupedOutboundPayloadSnapshot: null,
      providerResponseSummary: null,
      errors: [
        {
          errorCode: previewResponse.errorCode ?? config.previewErrorCode,
          errorMessage: previewResponse.error ?? config.previewErrorMessage,
          details: previewResponse.details ?? null,
        },
      ],
      notes: [],
      rawDetails: {
        previewResult: payloadPreviewResult,
      },
    };
  }

  buildChannexSyncNotReadyResult({
    payloadPreview,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
  }) {
    const response = ok({
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

    return {
      response,
      evidencePatch: {
        integrationAccountId: payloadPreview.integrationAccountId || null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: [],
        providerResponseSummary: { ready: false, calledProvider: false, results: [] },
        taskIds: [],
        warnings: [],
        errors: [],
        notes: baseNotes,
        rawDetails: { payloadPreview },
      },
    };
  }

  buildChannexSyncNoopResult({
    payloadPreview,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    noopNote,
  }) {
    const response = ok({
      channel: payloadPreview.channel || "CHANNEX",
      integrationAccountId: payloadPreview.integrationAccountId || null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      ready: true,
      calledProvider: false,
      requestCount: 0,
      results: [],
      notes: [...baseNotes, noopNote],
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: payloadPreview.integrationAccountId || null,
        status: "NOOP",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: [],
        providerResponseSummary: { ready: true, calledProvider: false, results: [] },
        taskIds: [],
        warnings: [],
        errors: [],
        notes: response.response.notes,
        rawDetails: { payloadPreview },
      },
    };
  }

  buildChannexSyncProviderResult({
    integration,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    transformedPayloads,
    providerResult,
    formatProviderResult,
    payloadPreview,
  }) {
    const results = Array.isArray(providerResult?.results) ? providerResult.results : [];
    const response = ok({
      channel: "CHANNEX",
      integrationAccountId: integration.id,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      ready: true,
      calledProvider: true,
      requestCount: transformedPayloads.length,
      results: results.map((result) => formatProviderResult(result)),
      notes: baseNotes,
    });
    const outcome = deriveEvidenceOutcome({
      statusCode: response.statusCode,
      ready: response.response.ready,
      calledProvider: response.response.calledProvider,
      results: response.response.results,
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: integration.id,
        status: outcome.status,
        overallSuccess: outcome.overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: transformedPayloads,
        providerResponseSummary: {
          requestCount: transformedPayloads.length,
          results: response.response.results,
        },
        taskIds: collectTaskIdsFromResultList(response.response.results),
        warnings: collectWarningsFromResultList(response.response.results),
        errors: collectErrorsFromResultList(response.response.results),
        notes: baseNotes,
        rawDetails: {
          payloadPreview,
          providerResult,
        },
      },
    };
  }

  async runChannexPreviewPayloadSync({
    userId,
    domitsPropertyId,
    dateFrom,
    dateTo,
    options = {},
    syncType,
    baseNotes,
    previewErrorCode,
    previewErrorMessage,
    selectGroupedPayloads,
    buildPayloads,
    afterBuildPayloads = null,
    noopStage = "afterTransform",
    isNoop,
    noopNote,
    providerCall,
    formatProviderResult,
    syncErrorCode,
    syncErrorMessage,
  }) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);
    const captureState = getCaptureState(options);
    const finalize = this.createChannexSyncFinalizer({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom: dateFrom,
      rawDateTo: dateTo,
      startedAt,
      syncType,
      options,
    });

    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationFailure) return await finalize(validationFailure.response, validationFailure.evidencePatch);

    try {
      const payloadPreviewResult = await this.previewChannexAriPayloads(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
      if (payloadPreviewResult?.statusCode !== 200) {
        return await finalize(
          payloadPreviewResult,
          this.buildChannexSyncPreviewFailureEvidencePatch(payloadPreviewResult, {
            previewErrorCode,
            previewErrorMessage,
          })
        );
      }

      const payloadPreview = payloadPreviewResult.response || {};
      const notes = [...(Array.isArray(payloadPreview.notes) ? payloadPreview.notes : []), ...baseNotes];
      const mappingSnapshot = {
        missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
        sourceSummary: payloadPreview.sourceSummary ?? null,
      };

      if (!payloadPreview.ready) {
        const notReady = this.buildChannexSyncNotReadyResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
        });
        return await finalize(notReady.response, notReady.evidencePatch);
      }

      const groupedPayloads = selectGroupedPayloads(payloadPreview);

      if (noopStage === "beforeTransform" && isNoop({ groupedPayloads, transformedPayloads: [] })) {
        const noop = this.buildChannexSyncNoopResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
          noopNote,
        });
        return await finalize(noop.response, noop.evidencePatch);
      }

      const transformedPayloads = buildPayloads(groupedPayloads);
      if (typeof afterBuildPayloads === "function") {
        afterBuildPayloads({ baseNotes: notes, transformedPayloads });
      }
      if (captureState) {
        captureState.groupedOutboundPayloadSnapshot = transformedPayloads;
      }

      if (noopStage !== "beforeTransform" && isNoop({ groupedPayloads, transformedPayloads })) {
        const noop = this.buildChannexSyncNoopResult({
          payloadPreview,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes: notes,
          mappingSnapshot,
          noopNote,
        });
        return await finalize(noop.response, noop.evidencePatch);
      }

      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: transformedPayloads,
        baseNotes: notes,
        payloadPreview,
      });
      if (!credentialContext.ok) {
        return await finalize(credentialContext.response, credentialContext.evidencePatch);
      }

      const { integration, secret } = credentialContext;
      const providerResult = await providerCall(secret, transformedPayloads);
      const providerSyncResult = this.buildChannexSyncProviderResult({
        integration,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        baseNotes: notes,
        mappingSnapshot,
        transformedPayloads,
        providerResult,
        formatProviderResult,
        payloadPreview,
      });
      return await finalize(providerSyncResult.response, providerSyncResult.evidencePatch);
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: syncErrorMessage,
          errorCode: syncErrorCode,
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: syncErrorCode,
              errorMessage: syncErrorMessage,
              details,
            },
          ],
          rawDetails: { caughtError: details },
        }
      );
    }
  }

  async syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    return this.runChannexPreviewPayloadSync({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      options,
      syncType: "availability",
      baseNotes: [
        "Manual staging sync only. This endpoint sends availability updates directly and does not run a scheduler, retries, or sync-state persistence.",
        "Approved temporary availability mapping rule applied: Domits availability true => 1, false => 0.",
      ],
      previewErrorCode: "CHANNEX_AVAILABILITY_PREVIEW_FAILED",
      previewErrorMessage: "Failed to build availability payload preview.",
      selectGroupedPayloads: (payloadPreview) =>
        Array.isArray(payloadPreview?.availabilityPayloadPreview?.groupedPayloads)
          ? payloadPreview.availabilityPayloadPreview.groupedPayloads
          : [],
      buildPayloads: buildChannexAvailabilitySyncPayloads,
      noopStage: "beforeTransform",
      isNoop: ({ groupedPayloads }) => !groupedPayloads.length,
      noopNote: "No availability payload groups were generated, so nothing was sent to Channex.",
      providerCall: (secret, transformedPayloads) =>
        this.channexProviderClient.pushAvailability(secret, transformedPayloads),
      formatProviderResult: formatChannexAvailabilityProviderResult,
      syncErrorCode: "CHANNEX_AVAILABILITY_SYNC_FAILED",
      syncErrorMessage: "Failed to sync Channex availability.",
    });
  }

  async syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    return this.runChannexPreviewPayloadSync({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      options,
      syncType: "restrictions",
      baseNotes: [
        "Manual staging sync only. This endpoint sends rate updates through Channex restrictions and does not run a scheduler, retries, or sync-state persistence.",
        "Restrictions sync sends Channex rate values and can add supported mapped fields: stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay.",
      ],
      previewErrorCode: "CHANNEX_RESTRICTIONS_PREVIEW_FAILED",
      previewErrorMessage: "Failed to build restrictions payload preview.",
      selectGroupedPayloads: (payloadPreview) =>
        Array.isArray(payloadPreview?.restrictionRatePayloadPreview?.groupedPayloads)
          ? payloadPreview.restrictionRatePayloadPreview.groupedPayloads
          : [],
      buildPayloads: buildChannexRestrictionSyncPayloads,
      afterBuildPayloads: ({ baseNotes, transformedPayloads }) =>
        appendRestrictionSyncOutboundNotes(baseNotes, transformedPayloads),
      isNoop: ({ transformedPayloads }) => !transformedPayloads.length,
      noopNote: "No nightlyPrice values were available to send, so nothing was posted to Channex.",
      providerCall: (secret, transformedPayloads) =>
        this.channexProviderClient.pushRestrictions(secret, transformedPayloads),
      formatProviderResult: formatChannexRestrictionProviderResult,
      syncErrorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
      syncErrorMessage: "Failed to sync Channex restrictions.",
    });
  }

  async runGatedChannexAriSteps({ userId, domitsPropertyId, dateFrom, dateTo, baseNotes }) {
    const availabilityCaptureState = {};
    const availabilityStep = await this.syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo, {
      skipEvidence: true,
      includeEvidenceMetadata: false,
      captureState: availabilityCaptureState,
    });
    const availabilityResponse = availabilityStep?.response || {};
    const availabilityCalledProvider = !!availabilityResponse.calledProvider;
    const availabilityWarnings = resultListHasWarnings(availabilityResponse.results);
    const availabilityErrors = resultListHasErrors(availabilityResponse.results);

    let restrictionsStep = null;
    let restrictionsCaptureState = null;
    if (
      availabilityStep?.statusCode === 200 &&
      availabilityResponse.ready !== false &&
      availabilityCalledProvider &&
      !availabilityWarnings &&
      !availabilityErrors
    ) {
      restrictionsCaptureState = {};
      restrictionsStep = await this.syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo, {
        skipEvidence: true,
        includeEvidenceMetadata: false,
        captureState: restrictionsCaptureState,
      });
    } else {
      const skipNote = getRestrictionSkipNote({
        availabilityStep,
        availabilityCalledProvider,
        availabilityWarnings,
        availabilityErrors,
      });
      if (skipNote) baseNotes.push(skipNote);
    }

    const restrictionsResponse = restrictionsStep?.response || null;
    appendUniqueNotes(baseNotes, restrictionsResponse?.notes);
    return {
      availabilityCaptureState,
      restrictionsCaptureState,
      availabilityStep,
      restrictionsStep,
      availabilityResponse,
      restrictionsResponse,
      availabilityCalledProvider,
      restrictionsCalledProvider: !!restrictionsResponse?.calledProvider,
      availabilityWarnings,
      availabilityErrors,
      restrictionsWarnings: resultListHasWarnings(restrictionsResponse?.results),
      restrictionsErrors: resultListHasErrors(restrictionsResponse?.results),
    };
  }

  async runFullChannexAriSteps({ userId, domitsPropertyId, dateFrom, dateTo, baseNotes }) {
    const availabilityCaptureState = {};
    const restrictionsCaptureState = {};
    const availabilityStep = await this.syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo, {
      skipEvidence: true,
      includeEvidenceMetadata: false,
      captureState: availabilityCaptureState,
    });
    const restrictionsStep = await this.syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo, {
      skipEvidence: true,
      includeEvidenceMetadata: false,
      captureState: restrictionsCaptureState,
    });
    const availabilityResponse = availabilityStep?.response || {};
    const restrictionsResponse = restrictionsStep?.response || {};
    appendUniqueNotes(baseNotes, restrictionsResponse?.notes);

    return {
      availabilityCaptureState,
      restrictionsCaptureState,
      availabilityStep,
      restrictionsStep,
      availabilityResponse,
      restrictionsResponse,
      availabilityCalledProvider: !!availabilityResponse.calledProvider,
      restrictionsCalledProvider: !!restrictionsResponse.calledProvider,
    };
  }

  async syncChannexAri(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const normalizedDateFrom = parseIsoDateParam(dateFrom);
    const normalizedDateTo = parseIsoDateParam(dateTo);
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: "ari",
          dateFrom: normalizedDateFrom ?? requireStr(dateFrom),
          dateTo: normalizedDateTo ?? requireStr(dateTo),
          startedAt,
          evidencePatch,
        }),
        options
      );

    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    });
    if (validationFailure) return await finalize(validationFailure.response, validationFailure.evidencePatch);

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        const readinessResponse = readinessResult?.response || {};
        return await finalize(readinessResult, {
          integrationAccountId: readinessResponse.integrationAccountId ?? null,
          status: getInvalidRequestOrFailedStatus(readinessResult?.statusCode),
          overallSuccess: false,
          mappingSnapshot: {
            missingMappings: Array.isArray(readinessResponse.missingMappings) ? readinessResponse.missingMappings : [],
          },
          errors: [
            {
              errorCode: readinessResponse.errorCode ?? "CHANNEX_ARI_TARGETS_FAILED",
              errorMessage: readinessResponse.error ?? "Failed to get Channex ARI targets.",
              details: readinessResponse.details ?? null,
            },
          ],
          rawDetails: { readinessResult },
        });
      }

      const readiness = readinessResult.response || {};
      const baseNotes = [
        "Manual staging orchestration only. This endpoint runs the existing availability sync first and the Channex restrictions sync second.",
        "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
      ];
      const mappingSnapshot = {
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        propertyMapping: readiness.propertyMapping ?? null,
        roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
      };

      if (!readiness.ready) {
        const response = ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          ready: false,
          calledProvider: false,
          steps: {
            availability: null,
            restrictions: null,
          },
          overallSuccess: false,
          notes: appendMissingMappingNotes(baseNotes, readiness.missingMappings),
        });
        return await finalize(response, {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "BLOCKED",
          overallSuccess: false,
          mappingSnapshot,
          groupedOutboundPayloadSnapshot: {
            availability: [],
            restrictions: [],
          },
          providerResponseSummary: {
            calledProvider: false,
            steps: {
              availability: null,
              restrictions: null,
            },
          },
          notes: response.response.notes,
          rawDetails: { readiness },
        });
      }

      const payloadPreviewResult = await this.previewChannexAriPayloads(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
      const payloadPreview = payloadPreviewResult?.statusCode === 200 ? payloadPreviewResult.response || {} : null;

      const {
        availabilityCaptureState,
        restrictionsCaptureState,
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        availabilityCalledProvider,
        restrictionsCalledProvider,
        availabilityWarnings,
        availabilityErrors,
        restrictionsWarnings,
        restrictionsErrors,
      } = await this.runGatedChannexAriSteps({
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        baseNotes,
      });

      const overallSuccess = getAriSyncOverallSuccess({
        availabilityStep,
        availabilityCalledProvider,
        availabilityWarnings,
        availabilityErrors,
        restrictionsStep,
        restrictionsCalledProvider,
        restrictionsWarnings,
        restrictionsErrors,
      });

      const response = ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId:
          availabilityResponse.integrationAccountId ??
          restrictionsResponse?.integrationAccountId ??
          readiness.integrationAccountId ??
          null,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        ready: true,
        calledProvider: availabilityCalledProvider || restrictionsCalledProvider,
        steps: {
          availability: getStepResponse(availabilityStep, availabilityResponse),
          restrictions: getOptionalStepResponse(restrictionsStep, restrictionsResponse),
        },
        overallSuccess,
        notes: baseNotes,
      });

      const combinedWarnings = dedupeByJson([
        ...collectWarningsFromResultList(availabilityResponse.results),
        ...collectWarningsFromResultList(restrictionsResponse?.results),
      ]);
      const combinedErrors = dedupeByJson([
        ...collectErrorsFromResultList(availabilityResponse.results),
        ...collectErrorsFromResultList(restrictionsResponse?.results),
        ...buildFailedStepErrors(
          availabilityStep,
          availabilityResponse,
          "CHANNEX_AVAILABILITY_STEP_FAILED",
          "Availability step failed."
        ),
        ...buildFailedStepErrors(
          restrictionsStep,
          restrictionsResponse,
          "CHANNEX_RESTRICTIONS_STEP_FAILED",
          "Restrictions step failed.",
          { optional: true }
        ),
      ]);
      const combinedTaskIds = dedupeByJson([
        ...collectTaskIdsFromResultList(availabilityResponse.results),
        ...collectTaskIdsFromResultList(restrictionsResponse?.results),
      ]);

      const combinedStatus = getCombinedSyncStatus({
        overallSuccess,
        providerCalled: availabilityCalledProvider || restrictionsCalledProvider,
        combinedErrors,
        combinedWarnings,
      });

      return await finalize(response, {
        integrationAccountId:
          response.response.integrationAccountId ?? readiness.integrationAccountId ?? null,
        status: combinedStatus,
        overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: getCapturedGroupedOutboundPayloadSnapshot(availabilityCaptureState),
          restrictions: getCapturedGroupedOutboundPayloadSnapshot(restrictionsCaptureState),
        },
        providerResponseSummary: {
          calledProvider: response.response.calledProvider,
          steps: {
            availability: getStepSummary(availabilityStep, availabilityResponse),
            restrictions: getOptionalStepSummary(restrictionsStep, restrictionsResponse),
          },
        },
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
        notes: baseNotes,
        rawDetails: {
          readiness,
          payloadPreview,
          availabilityStep,
          restrictionsStep,
        },
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to run combined Channex ARI sync.",
          errorCode: "CHANNEX_ARI_SYNC_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_ARI_SYNC_FAILED",
              errorMessage: "Failed to run combined Channex ARI sync.",
              details,
            },
          ],
          rawDetails: { caughtError: details },
        }
      );
    }
  }

  async syncChannexFull(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const rawDateFrom = requireStr(dateFrom);
    const rawDateTo = requireStr(dateTo);
    const usingDefaultDateRange = !rawDateFrom && !rawDateTo;
    const defaultStartDate = usingDefaultDateRange ? getUtcTodayIsoDate() : null;
    const normalizedDateFrom = usingDefaultDateRange ? defaultStartDate : parseIsoDateParam(rawDateFrom);
    const normalizedDateTo = usingDefaultDateRange
      ? addDaysToIsoDate(defaultStartDate, CHANNEX_CERTIFICATION_FULL_SYNC_DAYS - 1)
      : parseIsoDateParam(rawDateTo);
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: "certification_full",
          dateFrom: normalizedDateFrom ?? rawDateFrom,
          dateTo: normalizedDateTo ?? rawDateTo,
          startedAt,
          evidencePatch,
        }),
        options
      );

    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom,
      rawDateTo,
      requireCompleteDatePair: true,
      usingDefaultDateRange,
    });
    if (validationFailure) return await finalize(validationFailure.response, validationFailure.evidencePatch);

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        const readinessResponse = readinessResult?.response || {};
        return await finalize(readinessResult, {
          integrationAccountId: readinessResponse.integrationAccountId ?? null,
          status: getInvalidRequestOrFailedStatus(readinessResult?.statusCode),
          overallSuccess: false,
          mappingSnapshot: {
            missingMappings: Array.isArray(readinessResponse.missingMappings) ? readinessResponse.missingMappings : [],
          },
          errors: [
            {
              errorCode: readinessResponse.errorCode ?? "CHANNEX_ARI_TARGETS_FAILED",
              errorMessage: readinessResponse.error ?? "Failed to get Channex ARI targets.",
              details: readinessResponse.details ?? null,
            },
          ],
          rawDetails: { readinessResult },
        });
      }

      const readiness = readinessResult.response || {};
      const baseNotes = createCertificationFullSyncBaseNotes(usingDefaultDateRange);

      const mappingSnapshot = {
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        propertyMapping: readiness.propertyMapping ?? null,
        roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
      };

      if (!readiness.ready) {
        const response = ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          usedDefaultDateRange: usingDefaultDateRange,
          ready: false,
          blocked: true,
          calledProvider: false,
          steps: {
            availability: null,
            restrictions: null,
          },
          taskIds: [],
          warnings: [],
          errors: [],
          overallSuccess: false,
          notes: appendMissingMappingNotes(baseNotes, readiness.missingMappings),
        });
        return await finalize(response, {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "BLOCKED",
          overallSuccess: false,
          mappingSnapshot,
          groupedOutboundPayloadSnapshot: {
            availability: [],
            restrictions: [],
          },
          providerResponseSummary: {
            calledProvider: false,
            steps: {
              availability: null,
              restrictions: null,
            },
          },
          notes: response.response.notes,
          rawDetails: { readiness },
        });
      }

      const {
        availabilityCaptureState,
        restrictionsCaptureState,
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        availabilityCalledProvider,
        restrictionsCalledProvider,
      } = await this.runFullChannexAriSteps({
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        baseNotes,
      });

      const combinedTaskIds = dedupeByJson([
        ...collectTaskIdsFromResultList(availabilityResponse.results),
        ...collectTaskIdsFromResultList(restrictionsResponse.results),
      ]);
      const combinedWarnings = dedupeByJson([
        ...collectWarningsFromResultList(availabilityResponse.results),
        ...collectWarningsFromResultList(restrictionsResponse.results),
      ]);
      const combinedErrors = dedupeByJson([
        ...collectErrorsFromResultList(availabilityResponse.results),
        ...collectErrorsFromResultList(restrictionsResponse.results),
        ...buildFailedStepErrors(
          availabilityStep,
          availabilityResponse,
          "CHANNEX_AVAILABILITY_STEP_FAILED",
          "Availability step failed."
        ),
        ...buildFailedStepErrors(
          restrictionsStep,
          restrictionsResponse,
          "CHANNEX_RESTRICTIONS_STEP_FAILED",
          "Restrictions step failed."
        ),
      ]);

      const overallSuccess = getFullSyncOverallSuccess({
        availabilityStep,
        restrictionsStep,
        availabilityCalledProvider,
        restrictionsCalledProvider,
        combinedWarnings,
        combinedErrors,
      });

      const combinedStatus = getCombinedSyncStatus({
        overallSuccess,
        providerCalled: availabilityCalledProvider || restrictionsCalledProvider,
        combinedErrors,
        combinedWarnings,
        blockNoProviderWithErrors: true,
      });

      const response = ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId:
          availabilityResponse.integrationAccountId ??
          restrictionsResponse.integrationAccountId ??
          readiness.integrationAccountId ??
          null,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        usedDefaultDateRange: usingDefaultDateRange,
        ready: true,
        blocked: false,
        calledProvider: availabilityCalledProvider || restrictionsCalledProvider,
        steps: {
          availability: getStepResponse(availabilityStep, availabilityResponse),
          restrictions: getStepResponse(restrictionsStep, restrictionsResponse),
        },
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
        overallSuccess,
        notes: baseNotes,
      });

      return await finalize(response, {
        integrationAccountId: response.response.integrationAccountId ?? readiness.integrationAccountId ?? null,
        status: combinedStatus,
        overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: getCapturedGroupedOutboundPayloadSnapshot(availabilityCaptureState),
          restrictions: getCapturedGroupedOutboundPayloadSnapshot(restrictionsCaptureState),
        },
        providerResponseSummary: {
          calledProvider: response.response.calledProvider,
          steps: {
            availability: getStepSummary(availabilityStep, availabilityResponse),
            restrictions: getStepSummary(restrictionsStep, restrictionsResponse),
          },
        },
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
        notes: baseNotes,
        rawDetails: {
          readiness,
          availabilityStep,
          restrictionsStep,
          usedDefaultDateRange: usingDefaultDateRange,
        },
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
              errorMessage: "Failed to run Channex certification full sync.",
              details,
            },
          ],
          rawDetails: { caughtError: details, usedDefaultDateRange: usingDefaultDateRange },
        }
      );
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
