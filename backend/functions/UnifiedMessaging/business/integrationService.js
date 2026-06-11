import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../.shared/integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../.shared/integrations/repositories/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../.shared/integrations/repositories/integrationSyncRepository.js";
import ReservationLinkRepository from "../.shared/integrations/repositories/reservationLinkRepository.js";
import { shapeCredentialIntegrationForResponse } from "../.shared/integrations/integrationResponse.js";
import ChannexSyncEvidenceRepository from "../.shared/channelManagement/repositories/channexSyncEvidenceRepository.js";
import ChannexBookingRevisionRepository from "../.shared/channelManagement/repositories/channexBookingRevisionRepository.js";
import ChannexExternalBookingImportRepository from "../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";
import Database from "../.shared/integrations/ORM/index.js";

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";
import HoliduCredentialStore from "../.shared/channelManagement/providers/holidu/credentialStore.js";
import HoliduProviderClient from "../.shared/channelManagement/providers/holidu/providerClient.js";
import ChannexCredentialStore from "../.shared/channelManagement/providers/channex/credentialStore.js";
import ChannexProviderClient from "../.shared/channelManagement/providers/channex/providerClient.js";
import ChannelManagementService from "../.shared/channelManagement/channelManagementService.js";
import { CHANNEX_STATUS } from "../.shared/channelManagement/channelManagementConstants.js";
import ChannexBookingPollingService from "../.shared/channelManagement/services/channexBookingPollingService.js";
import ChannexBookingRevisionImportService from "../.shared/channelManagement/services/channexBookingRevisionImportService.js";
import { CHANNEL_CHANNEX } from "../.shared/channelManagement/utils/channexBookingPollUtils.js";
import {
  CHANNEX_BOOKING_CANCELLED_TRIGGER,
  toBookingAvailabilityBridgeBooking,
} from "../.shared/channelManagement/utils/channexBookingRevisionUtils.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "../.shared/channelManagement/utils/channexRestrictionsSyncVersion.js";
import { hasChannexRequiredCredentialFields } from "../.shared/channelManagement/providers/channex/credentialUtils.js";
import ChannexBookingAvailabilityBridge, {
  ChannexBookingAvailabilityRepository,
  countActiveBookingsByNight,
} from "../.shared/channelManagement/channexBookingAvailabilityBridge.js";

const nowMs = () => Date.now();
const daysToMs = (days) => days * 24 * 60 * 60 * 1000;
const TIME_WINDOWS_MS = Object.freeze({
  DAY: daysToMs(1),
  THREE_DAYS: daysToMs(3),
});
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";
const PLACEHOLDER_REFRESH_STATUSES = new Set([
  "NEEDS_REAL_META_TOKEN_EXCHANGE",
  "PLACEHOLDER_REFRESHED",
]);

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const CHANNEX_FULL_SYNC_DEFAULTS = Object.freeze({ VERSION: "full-sync-v1", PROVIDER_REQUEST_TIMEOUT_MS: 8000, DEFAULT_SELLABLE_UNIT_COUNT: 1 });

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
  if (value === null || value === undefined || value === "") return null;
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
const CHANNEX_BOOLEAN_RESTRICTION_FIELDS = [
  "closed_to_arrival",
  "closed_to_departure",
  "stop_sell",
];
const CHANNEX_SUPPORTED_RESTRICTION_FIELDS = [
  ...CHANNEX_BOOLEAN_RESTRICTION_FIELDS,
  "max_stay",
  "min_stay_through",
];
const CHANNEX_CALENDAR_CHANGE_SYNC_TYPE = "calendar-change";
const CHANNEX_CALENDAR_CHANGE_TYPES = Object.freeze({
  AVAILABILITY: "availability",
  RATES: "rates",
  RESTRICTIONS: "restrictions",
});
const CHANNEX_CALENDAR_CHANGE_TYPE_ALIASES = new Map([
  ["availability", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["available", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["isavailable", CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY],
  ["rates", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["rate", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["pricing", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["price", CHANNEX_CALENDAR_CHANGE_TYPES.RATES],
  ["restrictions", CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS],
  ["restriction", CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS],
]);
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
const setPositiveIntegerField = (target, field, value) => {
  if (!Number.isInteger(value) || value < 1) return;
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
    if (stopSell !== null) out.stop_sell = stopSell;
    if (closedToArrival !== null) out.closed_to_arrival = closedToArrival;
    if (closedToDeparture !== null) out.closed_to_departure = closedToDeparture;
    setPositiveIntegerField(out, "min_stay_through", minStayThrough);
    setPositiveIntegerField(out, "max_stay", maxStay);
    return out;
  }

  return {};
};
const hasSupportedChannexRestrictionFields = (source) =>
  Object.keys(copySupportedChannexRestrictions(source)).length > 0;
const addChannexRestrictionMappingEntry = ({ supportedByField, omittedRestrictions, domitsRestriction, value }) => {
  if (domitsRestriction === "MinimumStay") {
    if (value > 0) {
      supportedByField.set("min_stay_through", {
        domitsRestriction,
        channexField: "min_stay_through",
        value,
      });
      return;
    }
    omittedRestrictions.push({
      domitsRestriction,
      value,
      reason:
        "Domits MinimumStay values less than or equal to 0 are not valid Channex min_stay_through values, so the field is omitted.",
    });
    return;
  }

  if (domitsRestriction === "MaximumStay") {
    if (value > 0) {
      supportedByField.set("max_stay", {
        domitsRestriction,
        channexField: "max_stay",
        value,
      });
      return;
    }
    omittedRestrictions.push({
      domitsRestriction,
      value,
      reason: "Domits MaximumStay values less than or equal to 0 mean no maximum, so Channex max_stay is omitted.",
    });
    return;
  }

  omittedRestrictions.push({
    domitsRestriction,
    value,
    reason: "No safe Domits-to-Channex restriction mapping is implemented for this restriction.",
  });
};
const buildChannexRestrictionMapping = (restrictions) => {
  const supportedByField = new Map();
  const omittedRestrictions = [];

  for (const restriction of Array.isArray(restrictions) ? restrictions : []) {
    const domitsRestriction = requireStr(restriction?.restriction);
    const value = normalizeRestrictionInteger(restriction?.value);
    if (!domitsRestriction || value === null) continue;

    addChannexRestrictionMappingEntry({
      supportedByField,
      omittedRestrictions,
      domitsRestriction,
      value,
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
  if (value !== null) {
    out.channexRestrictions[channexField] = value;
    out.supportedRestrictions.push({
      domitsRestriction,
      channexField,
      value,
      source: "calendar_override",
    });
  }
};
const addSnapshotBooleanRestrictionDefaults = (out) => {
  for (const channexField of CHANNEX_BOOLEAN_RESTRICTION_FIELDS) {
    if (Object.hasOwn(out.channexRestrictions, channexField)) continue;

    out.channexRestrictions[channexField] = false;
    out.supportedRestrictions.push({
      domitsRestriction: channexField,
      channexField,
      value: false,
      source: "full_sync_snapshot_default",
    });
  }
};
const buildEffectiveChannexRestrictionMapping = (
  globalRestrictionMapping,
  override,
  options = {}
) => {
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

  if (options.includeSnapshotBooleanRestrictions) {
    addSnapshotBooleanRestrictionDefaults(out);
  }

  if (overrideSummary.minStay === null) {
    addGlobalRestrictionField(out, globalRestrictionMapping, "min_stay_through");
  } else if (overrideSummary.minStay > 0) {
    out.channexRestrictions.min_stay_through = overrideSummary.minStay;
    out.supportedRestrictions.push({
      domitsRestriction: "minStay",
      channexField: "min_stay_through",
      value: overrideSummary.minStay,
      source: "calendar_override",
    });
  } else {
    out.omittedRestrictions.push({
      domitsRestriction: "minStay",
      channexField: "min_stay_through",
      value: overrideSummary.minStay,
      source: "calendar_override",
      reason:
        "Domits calendar override minStay values less than or equal to 0 are not valid Channex min_stay_through values, so the field is omitted.",
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
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});
const summarizeErrorStack = (error) =>
  requireStr(error?.stack)
    ?.split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
const parseStructuredEvidenceField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return parseJsonSafely(value) ?? value;
};
const CHANNEX_CERTIFICATION_FULL_SYNC_DAYS = 500;
const CHANNEX_ARI_PAYLOAD_PREVIEW_DEFAULT_PAGE_SIZE_DAYS = 30;
const CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_PAGE_SIZE_DAYS = 60;
const CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_REQUESTED_DAYS = CHANNEX_CERTIFICATION_FULL_SYNC_DAYS + 1;
const CHANNEX_CERTIFICATION_CANCEL_ACTION = "certification-cancel-booking";
const CHANNEX_CERTIFICATION_CANCEL_MODE = "admin-certification-no-refund";
const CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON =
  "Channex certification/admin cancellation does not process guest refunds.";
const CHANNEX_CANCELLED_BOOKING_STATUS = "Cancelled";
const CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES = new Set(["awaiting payment", "paid"]);
const getDomitsBookingStatus = (booking) => String(booking?.status || "").trim().toLowerCase();
const isActiveDomitsBookingForChannexCancel = (booking) =>
  CHANNEX_ADMIN_CANCEL_ACTIVE_STATUSES.has(getDomitsBookingStatus(booking));
const isCancelledDomitsBooking = (booking) => ["cancelled", "canceled"].includes(getDomitsBookingStatus(booking));
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
const getCaptureState = (options) => {
  const captureState = options?.captureState;
  if (captureState && typeof captureState === "object") {
    return captureState;
  }
  return null;
};
const logChannexRestrictionsSync = (stage, fields = {}) => {
  try {
    console.info(
      JSON.stringify({
        event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        stage,
        ...fields,
      })
    );
  } catch {
    console.info("CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC", stage);
  }
};
const logChannexFullCertificationSync = (stage, fields = {}) => {
  try {
    console.info(
      JSON.stringify({
        event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
        fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
        stage,
        ...fields,
      })
    );
  } catch {
    console.info("CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC", stage);
  }
};
const CHANNEX_FULL_SYNC_PROVIDER_MODES = new Set(["both", "availabilityOnly", "restrictionsOnly"]);
const CHANNEX_FULL_SYNC_DEBUG_STAGES = new Set([
  "validateOnly",
  "mappingsOnly",
  "availabilityPayloadOnly",
  "restrictionsPayloadOnly",
  "evidenceOnly",
]);
const parseBooleanQueryParam = (value) => String(value || "").trim().toLowerCase() === "true";
const normalizeChannexFullSyncProviderMode = (value) => {
  const normalized = requireStr(value) || "both";
  return CHANNEX_FULL_SYNC_PROVIDER_MODES.has(normalized) ? normalized : null;
};
const normalizeChannexFullSyncDebugStage = (value) => {
  const normalized = requireStr(value);
  if (!normalized) return null;
  return CHANNEX_FULL_SYNC_DEBUG_STAGES.has(normalized) ? normalized : "INVALID";
};
const buildChannexFullSyncErrorDetails = (stage, error) => ({
  stage,
  errorName: error?.name ?? null,
  errorMessage: error?.message ?? "Unhandled Channex full certification sync error.",
  details: describeLocalError(error),
  stackSummary: summarizeErrorStack(error),
});
const buildChannexRestrictionsSyncResponseMetadata = () => ({
  restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
  restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
});
const addChannexRestrictionsSyncVersion = (result) => {
  if (!result || typeof result !== "object") return result;
  const metadata = buildChannexRestrictionsSyncResponseMetadata();
  const response =
    result.response && typeof result.response === "object" && !Array.isArray(result.response)
      ? { ...metadata, ...result.response }
      : {
          ...metadata,
          value: result.response ?? null,
        };

  return {
    ...result,
    response,
  };
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
const countInclusiveIsoDateRangeDays = (dateFrom, dateTo) => {
  const fromMs = isoDateToUtcStartMs(dateFrom);
  const toMs = isoDateToUtcStartMs(dateTo);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) return null;
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000)) + 1;
};
const parsePositiveInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
  return parsed > 0 ? parsed : null;
};
const buildChannexPayloadPreviewPaginationContext = ({
  normalizedDateFrom,
  normalizedDateTo,
  pageDateFrom,
  pageSizeDays,
}) => {
  const totalRequestedDays = countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo);
  if (!totalRequestedDays || totalRequestedDays > CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_REQUESTED_DAYS) {
    return {
      error: bad(400, {
        error: "Requested Channex ARI payload preview range is too large.",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_RANGE_TOO_LARGE",
        maxRequestedDays: CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
        totalRequestedDays,
      }),
    };
  }

  const normalizedPageSizeDays =
    pageSizeDays === undefined || pageSizeDays === null || pageSizeDays === ""
      ? CHANNEX_ARI_PAYLOAD_PREVIEW_DEFAULT_PAGE_SIZE_DAYS
      : parsePositiveInteger(pageSizeDays);
  if (
    !normalizedPageSizeDays ||
    normalizedPageSizeDays > CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_PAGE_SIZE_DAYS
  ) {
    return {
      error: bad(400, {
        error: `Invalid query param: pageSizeDays must be an integer between 1 and ${CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_PAGE_SIZE_DAYS}.`,
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_INVALID_PAGE_SIZE",
        maxPageSizeDays: CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_PAGE_SIZE_DAYS,
      }),
    };
  }

  const normalizedPageDateFrom = pageDateFrom ? parseIsoDateParam(pageDateFrom) : normalizedDateFrom;
  if (!normalizedPageDateFrom) {
    return {
      error: bad(400, {
        error: "Invalid query param: pageDateFrom",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_INVALID_PAGE_DATE_FROM",
      }),
    };
  }
  if (normalizedPageDateFrom < normalizedDateFrom || normalizedPageDateFrom > normalizedDateTo) {
    return {
      error: bad(400, {
        error: "pageDateFrom must be inside the requested dateFrom/dateTo range.",
        errorCode: "CHANNEX_ARI_PAYLOAD_PREVIEW_PAGE_OUT_OF_RANGE",
      }),
    };
  }

  const proposedPageDateTo = addDaysToIsoDate(normalizedPageDateFrom, normalizedPageSizeDays - 1);
  const pageDateTo = proposedPageDateTo && proposedPageDateTo < normalizedDateTo ? proposedPageDateTo : normalizedDateTo;
  const loadedDays = countInclusiveIsoDateRangeDays(normalizedPageDateFrom, pageDateTo) || 0;
  const hasNextPage = pageDateTo < normalizedDateTo;
  const nextPageDateFrom = hasNextPage ? addDaysToIsoDate(pageDateTo, 1) : null;
  const hasPreviousPage = normalizedPageDateFrom > normalizedDateFrom;
  const previousCandidate = addDaysToIsoDate(normalizedPageDateFrom, -normalizedPageSizeDays);
  let previousPageDateFrom = null;
  if (hasPreviousPage) {
    previousPageDateFrom = normalizedDateFrom;
    if (previousCandidate && previousCandidate > normalizedDateFrom) previousPageDateFrom = previousCandidate;
  }

  return {
    pageDateFrom: normalizedPageDateFrom,
    pageDateTo,
    pagination: {
      requestedDateFrom: normalizedDateFrom,
      requestedDateTo: normalizedDateTo,
      pageDateFrom: normalizedPageDateFrom,
      pageDateTo,
      pageSizeDays: normalizedPageSizeDays,
      hasNextPage,
      nextPageDateFrom,
      hasPreviousPage,
      previousPageDateFrom,
      totalRequestedDays,
      loadedDays,
    },
  };
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
  const totalDays = countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo);
  if (!totalDays || totalDays > CHANNEX_CERTIFICATION_FULL_SYNC_DAYS) {
    const message = `Channex sync date range must be ${CHANNEX_CERTIFICATION_FULL_SYNC_DAYS} days or fewer.`;
    return {
      response: bad(400, {
        error: message,
        errorCode: "CHANNEX_SYNC_RANGE_TOO_LARGE",
        maxDays: CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
        totalDays,
      }),
      evidencePatch: buildInvalidRequestEvidencePatch("CHANNEX_SYNC_RANGE_TOO_LARGE", message),
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
const getStepRequestCount = (step, response) =>
  step && Number.isFinite(Number(response?.requestCount))
    ? Number(response.requestCount)
    : 0;
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
const buildEmptyAvailabilityOccupancyContext = () => ({
  activeBookings: [],
  activeCountsByNight: {},
  activeBookingCount: 0,
  activeBookingNightCount: 0,
});
const normalizeActiveBookingCount = (activeCountsByNight, isoDate) => {
  const count = Number(activeCountsByNight?.[isoDate]);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
};
const buildBookingAwareAvailability = ({ baseAvailability, activeBookingCount }) => {
  const sellableUnitCount = CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT;
  const availableUnitCount = baseAvailability
    ? Math.max(0, sellableUnitCount - Math.max(0, activeBookingCount))
    : 0;

  return {
    baseAvailability,
    activeBookingCount,
    sellableUnitCount,
    availableUnitCount,
    availability: availableUnitCount > 0,
  };
};
const buildAvailabilityOccupancyContext = async ({ bookingAvailabilityRepository, domitsPropertyId, dates }) => {
  const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
  const normalizedDates = (Array.isArray(dates) ? dates : []).map(parseIsoDateParam).filter(Boolean);
  if (
    !normalizedDomitsPropertyId ||
    normalizedDates.length === 0 ||
    typeof bookingAvailabilityRepository?.listActiveBookingsOverlappingRange !== "function"
  ) {
    return buildEmptyAvailabilityOccupancyContext();
  }

  const fromMs = isoDateToUtcStartMs(normalizedDates[0]);
  const lastDateStartMs = isoDateToUtcStartMs(normalizedDates.at(-1));
  if (fromMs === null || lastDateStartMs === null) {
    return buildEmptyAvailabilityOccupancyContext();
  }

  const activeBookingRows = await bookingAvailabilityRepository.listActiveBookingsOverlappingRange(
    normalizedDomitsPropertyId,
    fromMs,
    lastDateStartMs + TIME_WINDOWS_MS.DAY
  );
  const activeBookings = Array.isArray(activeBookingRows) ? activeBookingRows : [];
  const activeCountsByNight = countActiveBookingsByNight(activeBookings, normalizedDates);
  const activeBookingNightCount = Object.values(activeCountsByNight).reduce((total, count) => total + count, 0);

  return {
    activeBookings,
    activeCountsByNight,
    activeBookingCount: activeBookings.length,
    activeBookingNightCount,
  };
};
const buildAriPreviewCollections = ({
  dates,
  overrideMap,
  restrictionMapping,
  normalizedAvailabilityWindows,
  pricing,
  readiness,
  normalizedDomitsPropertyId,
  normalizedRestrictions,
  activeCountsByNight = {},
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
    const baseAvailability = getEffectiveAvailability({ override, isAvailableFromWindows });
    const availabilityState = buildBookingAwareAvailability({
      baseAvailability,
      activeBookingCount: normalizeActiveBookingCount(activeCountsByNight, isoDate),
    });
    const effectiveNightlyPrice = getEffectiveNightlyPrice({ override, pricing, isoDate });

    for (const roomTypeMapping of Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : []) {
      availabilityPreview.push({
        domitsPropertyId: normalizedDomitsPropertyId,
        externalPropertyId: roomTypeMapping.externalPropertyId,
        externalRoomTypeId: roomTypeMapping.externalRoomTypeId,
        date: isoDate,
        availability: availabilityState.availability,
        baseAvailability: availabilityState.baseAvailability,
        activeBookingCount: availabilityState.activeBookingCount,
        sellableUnitCount: availabilityState.sellableUnitCount,
        availableUnitCount: availabilityState.availableUnitCount,
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
const buildAvailabilityPayloadItemsFromReadiness = ({
  dates,
  overrideMap,
  normalizedAvailabilityWindows,
  readiness,
  normalizedDomitsPropertyId,
  activeCountsByNight = {},
}) => {
  const availabilityItems = [];

  for (const isoDate of Array.isArray(dates) ? dates : []) {
    const calendarDate = isoDateToCalendarInt(isoDate);
    const override = overrideMap.get(isoDate) || null;
    const isAvailableFromWindows = normalizedAvailabilityWindows.some(
      (entry) => calendarDate >= entry.availableStartDate && calendarDate <= entry.availableEndDate
    );
    const baseAvailability = getEffectiveAvailability({ override, isAvailableFromWindows });
    const availabilityState = buildBookingAwareAvailability({
      baseAvailability,
      activeBookingCount: normalizeActiveBookingCount(activeCountsByNight, isoDate),
    });

    for (const roomTypeMapping of Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : []) {
      availabilityItems.push({
        domitsPropertyId: normalizedDomitsPropertyId,
        externalPropertyId: roomTypeMapping.externalPropertyId,
        externalRoomTypeId: roomTypeMapping.externalRoomTypeId,
        date: isoDate,
        availability: availabilityState.availability,
        baseAvailability: availabilityState.baseAvailability,
        activeBookingCount: availabilityState.activeBookingCount,
        sellableUnitCount: availabilityState.sellableUnitCount,
        availableUnitCount: availabilityState.availableUnitCount,
      });
    }
  }

  return availabilityItems;
};
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
const buildRestrictionRateItemsFromReadiness = ({
  dates,
  overrideMap,
  restrictionMapping,
  pricing,
  readiness,
  normalizedDomitsPropertyId,
  normalizedRestrictions,
  includeSnapshotBooleanRestrictions = false,
}) => {
  const restrictionRateItems = [];
  const effectiveChannexRestrictionFields = new Set();
  const supportedCalendarRestrictionOverrideFields = new Set();

  for (const isoDate of Array.isArray(dates) ? dates : []) {
    const override = overrideMap.get(isoDate) || null;
    const effectiveRestrictionMapping = buildEffectiveChannexRestrictionMapping(restrictionMapping, override, {
      includeSnapshotBooleanRestrictions,
    });
    Object.keys(effectiveRestrictionMapping.channexRestrictions).forEach((field) =>
      effectiveChannexRestrictionFields.add(field)
    );
    effectiveRestrictionMapping.supportedRestrictions
      .filter((restriction) => restriction.source === "calendar_override")
      .forEach((restriction) => supportedCalendarRestrictionOverrideFields.add(restriction.channexField));

    const effectiveNightlyPrice = getEffectiveNightlyPrice({ override, pricing, isoDate });

    for (const ratePlanMapping of Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : []) {
      restrictionRateItems.push({
        externalPropertyId: ratePlanMapping.externalPropertyId,
        externalRoomTypeId: ratePlanMapping.externalRoomTypeId,
        externalRatePlanId: ratePlanMapping.externalRatePlanId,
        date: isoDate,
        nightlyPrice: effectiveNightlyPrice ?? null,
        rate: formatNightlyPriceForChannexRate(effectiveNightlyPrice),
        channexRestrictions: copySupportedChannexRestrictions(effectiveRestrictionMapping.channexRestrictions),
        supportedRestrictions: effectiveRestrictionMapping.supportedRestrictions.map((restriction) => ({ ...restriction })),
        omittedRestrictions: effectiveRestrictionMapping.omittedRestrictions.map((restriction) => ({ ...restriction })),
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
        calendarRestrictionOverride: { ...effectiveRestrictionMapping.calendarRestrictionOverride },
      });
    }
  }

  return {
    restrictionRateItems,
    supportedCalendarRestrictionOverrideFields,
    effectiveChannexRestrictionFields,
  };
};
const buildRestrictionRatePayloadGroups = (restrictionRateItems) => {
  const groupsByKey = new Map();

  for (const item of Array.isArray(restrictionRateItems) ? restrictionRateItems : []) {
    const key = `${item.externalPropertyId}::${item.externalRoomTypeId}::${item.externalRatePlanId}`;
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        externalRatePlanId: item.externalRatePlanId,
        values: [],
      });
    }

    groupsByKey.get(key).values.push({
      date: item.date,
      nightlyPrice: item.nightlyPrice,
      rate: item.rate,
      ...copySupportedChannexRestrictions(item.channexRestrictions),
      channexRestrictions: { ...item.channexRestrictions },
      supportedRestrictions: item.supportedRestrictions,
      omittedRestrictions: item.omittedRestrictions,
      restrictions: item.restrictions,
      calendarRestrictionOverride: item.calendarRestrictionOverride,
    });
  }

  return Array.from(groupsByKey.values());
};
const CHANNEX_ARI_PAYLOAD_PREVIEW_BASE_NOTES = [
  "Availability values are currently derived from property-scoped Domits availability and fanned out across saved Channex room type mappings.",
  "Rate values are currently derived from property-scoped Domits pricing and nightly overrides, then fanned out across saved Channex rate plan mappings.",
  "Supported Domits restrictions are mapped as date-level minStay or global MinimumStay -> Channex min_stay_through, and date-level maxStay or global MaximumStay -> Channex max_stay when the effective value is greater than 0.",
  "Supported date-level calendar restriction booleans are mapped as stopSell -> stop_sell, closedToArrival -> closed_to_arrival, and closedToDeparture -> closed_to_departure when explicitly set.",
  "Date-level calendar restriction overrides take priority over global Domits availability restrictions for the same Channex field.",
  "Explicit true and false values for stop_sell, closed_to_arrival, and closed_to_departure are included when a Domits calendar override explicitly sets them.",
  "MinimumAdvanceReservation, MaximumNightsPerYear, PreparationTimeDays, occupancy-based pricing, taxes, and currency fields are omitted from Channex restriction payloads.",
];
const createChannexAriPayloadPreviewNotes = () => [...CHANNEX_ARI_PAYLOAD_PREVIEW_BASE_NOTES];
const createChannexAvailabilityPayloadPreviewNotes = () => [
  "Availability sync builds only availability payloads for the selected full range.",
  "Availability values are derived from property-scoped Domits availability and date-level availability overrides, then fanned out across saved Channex room type mappings.",
];
const createChannexRestrictionRatePayloadPreviewNotes = () => [
  "Restrictions sync builds only rate/restriction payloads for the selected full range.",
  "Rate values are derived from Domits base pricing and nightly overrides, then fanned out across saved Channex rate plan mappings.",
];
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
const combineChannexAvailabilitySyncPayloadsForProvider = (groupedPayloads) => {
  const groups = Array.isArray(groupedPayloads) ? groupedPayloads : [];
  const values = groups.flatMap((group) => (Array.isArray(group?.values) ? group.values : []));
  if (!values.length) return [];

  const externalPropertyIds = Array.from(new Set(groups.map((group) => requireStr(group?.externalPropertyId)).filter(Boolean)));
  return [
    {
      externalPropertyId: externalPropertyIds.length === 1 ? externalPropertyIds[0] : null,
      externalRoomTypeId: null,
      values,
    },
  ];
};
const combineChannexRestrictionSyncPayloadsForProvider = (groupedPayloads) => {
  const groups = Array.isArray(groupedPayloads) ? groupedPayloads : [];
  const values = groups.flatMap((group) => (Array.isArray(group?.values) ? group.values : []));
  if (!values.length) return [];

  const roomTypeIdsByRatePlanId = new Map();
  const propertyIdsByRatePlanId = new Map();
  for (const group of groups) {
    const ratePlanId = requireStr(group?.externalRatePlanId);
    if (!ratePlanId) continue;

    const roomTypeIds = roomTypeIdsByRatePlanId.get(ratePlanId) || new Set();
    const roomTypeId = requireStr(group?.externalRoomTypeId);
    if (roomTypeId) roomTypeIds.add(roomTypeId);
    roomTypeIdsByRatePlanId.set(ratePlanId, roomTypeIds);

    const propertyIds = propertyIdsByRatePlanId.get(ratePlanId) || new Set();
    const propertyId = requireStr(group?.externalPropertyId);
    if (propertyId) propertyIds.add(propertyId);
    propertyIdsByRatePlanId.set(ratePlanId, propertyIds);
  }

  const externalRatePlanIds = Array.from(
    new Set(values.map((value) => requireStr(value?.rate_plan_id)).filter(Boolean))
  ).sort(compareAlphabetically);
  const externalPropertyIds = Array.from(
    new Set(
      [
        ...values.map((value) => requireStr(value?.property_id)),
        ...externalRatePlanIds.flatMap((ratePlanId) => Array.from(propertyIdsByRatePlanId.get(ratePlanId) || [])),
      ].filter(Boolean)
    )
  ).sort(compareAlphabetically);
  const externalRoomTypeIds = Array.from(
    new Set(externalRatePlanIds.flatMap((ratePlanId) => Array.from(roomTypeIdsByRatePlanId.get(ratePlanId) || [])))
  ).sort(compareAlphabetically);

  return [
    {
      externalPropertyId: externalPropertyIds.length === 1 ? externalPropertyIds[0] : null,
      externalPropertyIds,
      externalRoomTypeId: externalRoomTypeIds.length === 1 ? externalRoomTypeIds[0] : null,
      externalRoomTypeIds,
      externalRatePlanId: externalRatePlanIds.length === 1 ? externalRatePlanIds[0] : null,
      externalRatePlanIds,
      values,
    },
  ];
};
const summarizeChannexBooleanRestrictionCounts = (values) => {
  const counts = {};
  for (const field of CHANNEX_BOOLEAN_RESTRICTION_FIELDS) {
    counts[field] = { true: 0, false: 0 };
  }

  for (const value of Array.isArray(values) ? values : []) {
    for (const field of CHANNEX_BOOLEAN_RESTRICTION_FIELDS) {
      if (!Object.hasOwn(value || {}, field) || typeof value[field] !== "boolean") continue;
      counts[field][value[field] ? "true" : "false"] += 1;
    }
  }

  return counts;
};
const summarizeChannexRequestBody = (requestBody, metadata = {}) => {
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) return requestBody ?? null;
  const values = Array.isArray(requestBody.values) ? requestBody.values : [];
  if (!values.length) return requestBody;

  const dates = values.map((value) => requireStr(value?.date)).filter(Boolean).sort(compareAlphabetically);
  const metadataPropertyIds = [
    metadata?.externalPropertyId,
    ...(Array.isArray(metadata?.externalPropertyIds) ? metadata.externalPropertyIds : []),
  ];
  const metadataRoomTypeIds = [
    metadata?.externalRoomTypeId,
    ...(Array.isArray(metadata?.externalRoomTypeIds) ? metadata.externalRoomTypeIds : []),
  ];
  const metadataRatePlanIds = [
    metadata?.externalRatePlanId,
    ...(Array.isArray(metadata?.externalRatePlanIds) ? metadata.externalRatePlanIds : []),
  ];
  const booleanRestrictionCounts = summarizeChannexBooleanRestrictionCounts(values);
  const hasBooleanRestrictionValues = Object.values(booleanRestrictionCounts).some(
    (fieldCounts) => fieldCounts.true > 0 || fieldCounts.false > 0
  );
  return {
    valuesOmitted: true,
    valueCount: values.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    externalPropertyIds: Array.from(
      new Set([...metadataPropertyIds, ...values.map((value) => requireStr(value?.property_id))].filter(Boolean))
    ).sort(compareAlphabetically),
    externalRoomTypeIds: Array.from(
      new Set([...metadataRoomTypeIds, ...values.map((value) => requireStr(value?.room_type_id))].filter(Boolean))
    ).sort(compareAlphabetically),
    externalRatePlanIds: Array.from(
      new Set([...metadataRatePlanIds, ...values.map((value) => requireStr(value?.rate_plan_id))].filter(Boolean))
    ).sort(compareAlphabetically),
    ...(hasBooleanRestrictionValues ? { booleanRestrictionCounts } : {}),
  };
};
const summarizeChannexGroupedPayloads = (groups) =>
  (Array.isArray(groups) ? groups : []).map((group) => ({
    externalPropertyId: group?.externalPropertyId ?? null,
    externalPropertyIds: Array.isArray(group?.externalPropertyIds) ? group.externalPropertyIds : undefined,
    externalRoomTypeId: group?.externalRoomTypeId ?? null,
    externalRoomTypeIds: Array.isArray(group?.externalRoomTypeIds) ? group.externalRoomTypeIds : undefined,
    externalRatePlanId: group?.externalRatePlanId ?? null,
    externalRatePlanIds: Array.isArray(group?.externalRatePlanIds) ? group.externalRatePlanIds : undefined,
    requestBody: summarizeChannexRequestBody({ values: Array.isArray(group?.values) ? group.values : [] }, group),
  }));
const summarizePayloadPreviewForEvidence = (payloadPreview) => {
  if (!payloadPreview || typeof payloadPreview !== "object" || Array.isArray(payloadPreview)) return payloadPreview ?? null;
  const availability = payloadPreview.availabilityPayloadPreview || {};
  const restrictions = payloadPreview.restrictionRatePayloadPreview || {};

  return {
    channel: payloadPreview.channel ?? null,
    integrationAccountId: payloadPreview.integrationAccountId ?? null,
    domitsPropertyId: payloadPreview.domitsPropertyId ?? null,
    dateFrom: payloadPreview.dateFrom ?? null,
    dateTo: payloadPreview.dateTo ?? null,
    ready: payloadPreview.ready ?? null,
    missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
    sourceSummary: payloadPreview.sourceSummary ?? null,
    availabilityPayloadPreview: {
      itemCount: Array.isArray(availability.items) ? availability.items.length : 0,
      groupCount: Array.isArray(availability.groupedPayloads) ? availability.groupedPayloads.length : 0,
      groupedPayloads: summarizeChannexGroupedPayloads(availability.groupedPayloads),
    },
    restrictionRatePayloadPreview: {
      itemCount: Array.isArray(restrictions.items) ? restrictions.items.length : 0,
      groupCount: Array.isArray(restrictions.groupedPayloads) ? restrictions.groupedPayloads.length : 0,
      groupedPayloads: summarizeChannexGroupedPayloads(restrictions.groupedPayloads),
    },
    notes: Array.isArray(payloadPreview.notes) ? payloadPreview.notes : [],
  };
};
const buildChannexRestrictionSyncValue = (group, value) => {
  const rate = formatNightlyPriceForChannexRate(requireStr(value?.rate) || value?.nightlyPrice);
  const mappedRestrictions = {
    ...copySupportedChannexRestrictions(value?.channexRestrictions),
    ...copySupportedChannexRestrictions(value),
  };
  if (!rate && !hasSupportedChannexRestrictionFields(mappedRestrictions)) return null;

  const out = {
    property_id: group.externalPropertyId,
    rate_plan_id: group.externalRatePlanId,
    date: value.date,
    ...mappedRestrictions,
  };
  if (rate) out.rate = rate;
  return out;
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
const normalizeChannexCalendarChangeTypes = (changeTypes) =>
  Array.from(
    new Set(
      (Array.isArray(changeTypes) ? changeTypes : [changeTypes])
        .map((changeType) => requireStr(changeType)?.toLowerCase().replaceAll(/[^a-z]/g, ""))
        .map((changeType) => CHANNEX_CALENDAR_CHANGE_TYPE_ALIASES.get(changeType))
        .filter(Boolean)
    )
  ).sort(compareAlphabetically);
const normalizeChannexCalendarChangeDates = (changedDates) =>
  Array.from(
    new Set(
      (Array.isArray(changedDates) ? changedDates : [])
        .map((date) => parseIsoDateParam(date))
        .filter(Boolean)
    )
  ).sort(compareAlphabetically);
const buildChannexCalendarChangeDateContext = (body) => {
  const changedDates = normalizeChannexCalendarChangeDates(body?.changedDates);
  if (changedDates.length) {
    return {
      changedDates,
      dateFrom: changedDates[0],
      dateTo: changedDates.at(-1),
      exactDateSet: new Set(changedDates),
    };
  }

  const dateFrom = parseIsoDateParam(body?.dateFrom);
  const dateTo = parseIsoDateParam(body?.dateTo);
  return {
    changedDates: [],
    dateFrom,
    dateTo,
    exactDateSet: null,
  };
};
const filterChannexPayloadValuesByDate = (payloads, exactDateSet) =>
  (Array.isArray(payloads) ? payloads : [])
    .map((payload) => ({
      ...payload,
      values: (Array.isArray(payload?.values) ? payload.values : []).filter(
        (value) => !exactDateSet || exactDateSet.has(value?.date)
      ),
    }))
    .filter((payload) => payload.values.length > 0);
const buildChannexCalendarRestrictionSyncValue = (value, changeTypes) => {
  const includeRates = changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RATES);
  const includeRestrictions = changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS);
  const out = {
    property_id: value.property_id,
    rate_plan_id: value.rate_plan_id,
    date: value.date,
  };

  if (includeRates && Object.hasOwn(value || {}, "rate")) {
    out.rate = value.rate;
  }

  if (includeRestrictions) {
    for (const field of CHANNEX_SUPPORTED_RESTRICTION_FIELDS) {
      if (Object.hasOwn(value || {}, field)) {
        out[field] = value[field];
      }
    }
  }

  return Object.keys(out).length > 3 ? out : null;
};
const buildChannexCalendarRestrictionSyncPayloads = ({ payloads, changeTypes, exactDateSet }) =>
  filterChannexPayloadValuesByDate(payloads, exactDateSet)
    .map((payload) => ({
      ...payload,
      values: payload.values
        .map((value) => buildChannexCalendarRestrictionSyncValue(value, changeTypes))
        .filter(Boolean),
    }))
    .filter((payload) => payload.values.length > 0);
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
  endpoint: result.endpoint ?? null,
  method: result.method ?? null,
  externalPropertyId: result.externalPropertyId ?? null,
  externalRoomTypeId: result.externalRoomTypeId ?? null,
  requestBody: summarizeChannexRequestBody(result.requestBody, result),
  providerStatus: result.providerStatus ?? null,
  httpStatus: result.httpStatus ?? null,
  success: !!result.success,
  taskId: result.taskId ?? null,
  warnings: Array.isArray(result.warnings) ? result.warnings : [],
  errorCode: result.errorCode ?? null,
  errorMessage: result.errorMessage ?? null,
});
const formatChannexRestrictionProviderResult = (result) => ({
  endpoint: result.endpoint ?? null,
  method: result.method ?? null,
  externalPropertyId: result.externalPropertyId ?? null,
  externalRoomTypeId: result.externalRoomTypeId ?? null,
  externalRatePlanId: result.externalRatePlanId ?? null,
  requestBody: summarizeChannexRequestBody(result.requestBody, result),
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
const createCertificationFullSyncBaseNotes = (usingDefaultDateRange) => {
  const notes = [
    "Manual staging certification-prep runner only. This endpoint executes exactly one availability sync request and one restrictions/rates sync request for the selected full range.",
    "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
    "Domits currently maps minimum stay to Channex min_stay_through only; min_stay_arrival is not claimed by this backend because Domits has no separate safe arrival-based minimum-stay source field.",
  ];
  if (usingDefaultDateRange) {
    notes.push(
      `No explicit date range was supplied, so the certification full-sync used a ${CHANNEX_CERTIFICATION_FULL_SYNC_DAYS}-day UTC date range starting from today.`
    );
  }
  return notes;
};
const CHANNEX_CERTIFICATION_RATE_TARGETS = {
  bestAvailable: {
    label: "Best Available Rate",
    matches: (normalizedName) => normalizedName.includes("best") && normalizedName.includes("available"),
  },
  bedBreakfast: {
    label: "Bed & Breakfast",
    matches: (normalizedName) =>
      normalizedName.includes("bed") && normalizedName.includes("breakfast"),
  },
};
const CHANNEX_CERTIFICATION_MAX_AVAILABILITY = 1;
const CHANNEX_CERTIFICATION_ROOM_TARGETS = {
  twin: {
    label: "Twin Room",
    matches: (normalizedName) => normalizedName.includes("twin"),
  },
  double: {
    label: "Double Room",
    matches: (normalizedName) => normalizedName.includes("double"),
  },
};
const CHANNEX_CERTIFICATION_TEST_CASES = {
  "2": {
    title: "Single Date Update for Single Rate",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-22", fields: { rate: "333.00" } },
    ],
  },
  "3": {
    title: "Single Date Update for Multiple Rates",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-21", fields: { rate: "333.00" } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-25", fields: { rate: "444.00" } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-29", fields: { rate: "456.23" } },
    ],
  },
  "4": {
    title: "Multiple Date Update for Multiple Rates",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", dateFrom: "2026-11-01", dateTo: "2026-11-10", fields: { rate: "241.00" } },
      { room: "double", ratePlan: "bestAvailable", dateFrom: "2026-11-10", dateTo: "2026-11-16", fields: { rate: "312.66" } },
      { room: "double", ratePlan: "bedBreakfast", dateFrom: "2026-11-01", dateTo: "2026-11-20", fields: { rate: "111.00" } },
    ],
  },
  "5": {
    title: "Min Stay Update",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-23", fields: { min_stay_through: 3 } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-25", fields: { min_stay_through: 2 } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-15", fields: { min_stay_through: 5 } },
    ],
  },
  "6": {
    title: "Stop Sell Update",
    payloadType: "restrictions",
    updates: [
      { room: "twin", ratePlan: "bestAvailable", date: "2026-11-14", fields: { stop_sell: true } },
      { room: "double", ratePlan: "bestAvailable", date: "2026-11-16", fields: { stop_sell: true } },
      { room: "double", ratePlan: "bedBreakfast", date: "2026-11-20", fields: { stop_sell: true } },
    ],
  },
  "7": {
    title: "Multiple Restrictions Update",
    payloadType: "restrictions",
    updates: [
      {
        room: "twin",
        ratePlan: "bestAvailable",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-10",
        fields: { closed_to_arrival: true, closed_to_departure: false, max_stay: 4, min_stay_through: 1 },
      },
      {
        room: "twin",
        ratePlan: "bedBreakfast",
        dateFrom: "2026-11-12",
        dateTo: "2026-11-16",
        fields: { closed_to_arrival: false, closed_to_departure: true, min_stay_through: 6 },
      },
      {
        room: "double",
        ratePlan: "bestAvailable",
        dateFrom: "2026-11-10",
        dateTo: "2026-11-16",
        fields: { closed_to_arrival: true, min_stay_through: 2 },
      },
      {
        room: "double",
        ratePlan: "bedBreakfast",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-20",
        fields: { min_stay_through: 10 },
      },
    ],
  },
  "8": {
    title: "Half-year Update",
    payloadType: "restrictions",
    updates: [
      {
        room: "twin",
        ratePlan: "bestAvailable",
        dateFrom: "2026-12-01",
        dateTo: "2027-05-01",
        fields: { rate: "432.00", closed_to_arrival: false, closed_to_departure: false, min_stay_through: 2 },
      },
      {
        room: "double",
        ratePlan: "bestAvailable",
        dateFrom: "2026-12-01",
        dateTo: "2027-05-01",
        fields: { rate: "342.00", min_stay_through: 3 },
      },
    ],
  },
  "9": {
    title: "Single Date Availability Update",
    payloadType: "availability",
    updates: [
      { room: "twin", date: "2026-11-21", availability: 1 },
      { room: "double", date: "2026-11-25", availability: 0 },
    ],
  },
  "10": {
    title: "Multiple Date Availability Update",
    payloadType: "availability",
    updates: [
      { room: "twin", dateFrom: "2026-11-10", dateTo: "2026-11-16", availability: 1 },
      { room: "double", dateFrom: "2026-11-17", dateTo: "2026-11-24", availability: 1 },
    ],
  },
};
const normalizeCertificationName = (value) =>
  String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const findCertificationRoomMapping = (readiness, roomKey) => {
  const target = CHANNEX_CERTIFICATION_ROOM_TARGETS[roomKey];
  if (!target) return null;
  return (
    (Array.isArray(readiness?.roomTypeMappings) ? readiness.roomTypeMappings : []).find((mapping) =>
      target.matches(normalizeCertificationName(mapping?.externalRoomTypeName))
    ) || null
  );
};
const findCertificationRatePlanMapping = (readiness, roomMapping, ratePlanKey) => {
  const target = CHANNEX_CERTIFICATION_RATE_TARGETS[ratePlanKey];
  if (!target || !roomMapping) return null;
  const roomTypeId = requireStr(roomMapping.externalRoomTypeId);
  return (
    (Array.isArray(readiness?.ratePlanMappings) ? readiness.ratePlanMappings : []).find(
      (mapping) =>
        requireStr(mapping?.externalRoomTypeId) === roomTypeId &&
        target.matches(normalizeCertificationName(mapping?.externalRatePlanName))
    ) || null
  );
};
const getCertificationUpdateDates = (update) =>
  update?.date ? [update.date] : buildCalendarDateRange(update?.dateFrom, update?.dateTo);
const normalizeCertificationAvailabilityValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  return Math.max(0, Math.min(CHANNEX_CERTIFICATION_MAX_AVAILABILITY, Math.trunc(numericValue)));
};
const getCertificationRoomLabel = (roomKey) => CHANNEX_CERTIFICATION_ROOM_TARGETS[roomKey]?.label ?? roomKey;
const getCertificationRatePlanLabel = (ratePlanKey) =>
  CHANNEX_CERTIFICATION_RATE_TARGETS[ratePlanKey]?.label ?? ratePlanKey;
const getCertificationUpdateDateTarget = (update) => update.date || `${update.dateFrom || "?"} to ${update.dateTo || "?"}`;
const buildCertificationPayloadUpdate = ({ readiness, testCase, update }) => {
  const roomLabel = getCertificationRoomLabel(update.room);
  const roomMapping = findCertificationRoomMapping(readiness, update.room);
  if (!roomMapping) {
    return {
      failure: {
        target: roomLabel,
        errorCode: "CHANNEX_CERTIFICATION_ROOM_MAPPING_MISSING",
        errorMessage: `Missing Channex room type mapping for ${roomLabel}.`,
      },
    };
  }

  const dates = getCertificationUpdateDates(update);
  const dateTarget = getCertificationUpdateDateTarget(update);
  if (!dates.length) {
    return {
      failure: {
        target: dateTarget,
        errorCode: "CHANNEX_CERTIFICATION_TEST_INVALID_DATE_RANGE",
        errorMessage: "Certification test case update has an invalid date range.",
      },
    };
  }

  if (testCase.payloadType === "availability") {
    const availability = normalizeCertificationAvailabilityValue(update.availability);
    if (availability === null) {
      return {
        failure: {
          target: `${roomLabel} / ${dateTarget}`,
          errorCode: "CHANNEX_CERTIFICATION_TEST_INVALID_AVAILABILITY",
          errorMessage: "Certification availability update has an invalid availability value.",
        },
      };
    }
    return {
      values: dates.map((date) => ({
        property_id: roomMapping.externalPropertyId,
        room_type_id: roomMapping.externalRoomTypeId,
        date,
        availability,
      })),
    };
  }

  const ratePlanLabel = getCertificationRatePlanLabel(update.ratePlan);
  const ratePlanMapping = findCertificationRatePlanMapping(readiness, roomMapping, update.ratePlan);
  if (!ratePlanMapping) {
    return {
      failure: {
        target: `${roomLabel} / ${ratePlanLabel}`,
        errorCode: "CHANNEX_CERTIFICATION_RATE_PLAN_MAPPING_MISSING",
        errorMessage: `Missing Channex rate plan mapping for ${roomLabel} / ${ratePlanLabel}.`,
      },
    };
  }

  return {
    values: dates.map((date) => ({
      property_id: ratePlanMapping.externalPropertyId,
      rate_plan_id: ratePlanMapping.externalRatePlanId,
      date,
      ...update.fields,
    })),
  };
};
const collectChannexValueDateRange = (values) => {
  const dates = (Array.isArray(values) ? values : []).map((value) => requireStr(value?.date)).filter(Boolean).sort(compareAlphabetically);
  return {
    dateFrom: dates[0] ?? null,
    dateTo: dates.at(-1) ?? null,
  };
};
const formatCertificationTestCaseId = (value) => {
  const normalized = requireStr(value);
  return normalized ? normalized.replace(/^#/, "") : null;
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
const resolveSelectedWhatsAppNumber = (secret, integration) => {
  const selectableNumbers = Array.isArray(secret?.selectableNumbers) ? secret.selectableNumbers : [];
  const selectedPhoneNumberId =
    requireStr(secret?.selectedPhoneNumberId) || requireStr(integration?.externalAccountId) || null;
  if (!selectedPhoneNumberId) {
    return null;
  }

  return (
    selectableNumbers.find((item) => requireStr(item?.phoneNumberId) === selectedPhoneNumberId) || null
  );
};
const resolveWhatsAppPublicPhoneNumber = (secret, integration) =>
  requireStr(secret?.selectedPhoneNumber) || requireStr(resolveSelectedWhatsAppNumber(secret, integration)?.phoneNumber);
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
    bookingAvailabilityRepository = new ChannexBookingAvailabilityRepository(),
    externalBookingImportRepository = new ChannexExternalBookingImportRepository(),
    channexBookingAvailabilityBridge = new ChannexBookingAvailabilityBridge(),
    runner = new SyncRunner(),
    credentialStore = new WhatsAppCredentialStore(),
    holiduCredentialStore = new HoliduCredentialStore(),
    holiduProviderClient = new HoliduProviderClient(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
    channelManagementService = null,
    channexBookingRevisionImportService = null,
    channexBookingPollingService = null,
  } = {}) {
    this.accounts = accounts;
    this.props = props;
    this.ratePlans = ratePlans;
    this.roomTypes = roomTypes;
    this.sync = sync;
    this.resLinks = resLinks;
    this.channexEvidence = channexEvidence;
    this.channexBookingRevisions = channexBookingRevisions;
    this.bookingAvailabilityRepository = bookingAvailabilityRepository;
    this.externalBookingImportRepository = externalBookingImportRepository;
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
    this.runner = runner;
    this.credentialStore = credentialStore;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
    this.channelManagementService =
      channelManagementService ||
      new ChannelManagementService({
        accounts,
        sync,
        holiduCredentialStore,
        holiduProviderClient,
        channexCredentialStore,
        channexProviderClient,
      });
    this.channexBookingRevisionImportService =
      channexBookingRevisionImportService ||
      new ChannexBookingRevisionImportService({
        accounts,
        props,
        ratePlans,
        roomTypes,
        resLinks,
        channexBookingRevisions,
        externalBookingImportRepository,
        channexBookingAvailabilityBridge,
        channexCredentialStore,
        channexProviderClient,
        finalizeChannexSyncResult: (result, evidenceInput, options) =>
          this.finalizeChannexSyncResult(result, evidenceInput, options),
      });
    this.channexBookingPollingService =
      channexBookingPollingService ||
      new ChannexBookingPollingService({
        accounts,
        props,
        sync,
        channexCredentialStore,
        pullLatestChannexBookingsForResolvedContext: (context) =>
          this.channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext(
            context
          ),
      });
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

    if (expiresAt - now <= TIME_WINDOWS_MS.THREE_DAYS) {
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
      const publicPhoneNumber = resolveWhatsAppPublicPhoneNumber(secret, item);

      return shapeCredentialIntegrationForResponse({
        ...item,
        status: evaluation.status === "EXPIRING_SOON" ? "TOKEN_EXPIRING_SOON" : evaluation.status,
        lastErrorMessage: preservesExistingError ? item.lastErrorMessage : evaluation.message,
        phoneNumber: publicPhoneNumber,
      });
    } catch (error) {
      this.logTokenLifecycle("warn", "WhatsApp token health evaluation failed during list", item, "health_check_error", {
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
      });
      return shapeCredentialIntegrationForResponse({
        ...item,
        status: "UNKNOWN",
        lastErrorMessage: item.lastErrorMessage || "Unable to evaluate WhatsApp token health.",
        phoneNumber: null,
      });
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
    return this.channelManagementService.connectHolidu(body);
  }

  async checkHoliduStatus(userId) {
    return this.channelManagementService.checkHoliduStatus(userId);
  }

  async disconnectHolidu(body) {
    return this.channelManagementService.disconnectHolidu(body);
  }

  async connectChannex(body) {
    return this.channelManagementService.connectChannex(body);
  }

  async checkChannexStatus(userId) {
    return this.channelManagementService.checkChannexStatus(userId);
  }

  async disconnectChannex(body) {
    return this.channelManagementService.disconnectChannex(body);
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

  async saveChannexSetupMapping(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalPropertyName = requireStr(body?.externalPropertyName);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRoomTypeName = requireStr(body?.externalRoomTypeName);
    const externalRatePlanId = requireStr(body?.externalRatePlanId);
    const externalRatePlanName = requireStr(body?.externalRatePlanName);
    const status = requireStr(body?.status) || "ACTIVE";
    const scope = requireStr(body?.scope) || "SINGLE_UNIT";

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });
    if (!externalRatePlanId) return bad(400, { error: "Missing required field: externalRatePlanId" });
    if (scope !== "SINGLE_UNIT") {
      return bad(400, {
        error: "Channex setup mapping currently supports only SINGLE_UNIT scope.",
        errorCode: "CHANNEX_SETUP_SCOPE_UNSUPPORTED",
      });
    }

    const savedMappings = {
      property: null,
      roomType: null,
      ratePlan: null,
    };

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;
      const mappingBase = {
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        status,
      };

      savedMappings.property = await this.props.upsert({
        ...mappingBase,
        externalPropertyName,
      });
      savedMappings.roomType = await this.roomTypes.upsert({
        ...mappingBase,
        externalRoomTypeId,
        externalRoomTypeName,
      });
      savedMappings.ratePlan = await this.ratePlans.upsert({
        ...mappingBase,
        externalRoomTypeId,
        externalRatePlanId,
        externalRatePlanName,
      });

      const readinessResult = await this.getChannexAriTargets(normalizedUserId, domitsPropertyId);
      const readiness = readinessResult?.response ?? null;

      return ok({
        channel: "CHANNEX",
        action: "setup-mapping",
        scope,
        saved: true,
        integrationAccountId: integration.id,
        domitsPropertyId,
        savedMappings,
        readinessStatusCode: readinessResult?.statusCode ?? null,
        readiness,
        ready: readiness?.ready === true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex setup mapping.",
        errorCode: "CHANNEX_SETUP_MAPPING_FAILED",
        details,
        savedMappings,
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
      const occupancyContext = await buildAvailabilityOccupancyContext({
        bookingAvailabilityRepository: this.bookingAvailabilityRepository,
        domitsPropertyId: normalizedDomitsPropertyId,
        dates,
      });
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
        activeCountsByNight: occupancyContext.activeCountsByNight,
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
          bookingAwareAvailability: true,
          activeBookingCount: occupancyContext.activeBookingCount,
          activeBookingNightCount: occupancyContext.activeBookingNightCount,
          sellableUnitCount: CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT,
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

  async previewChannexAriPayloads(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
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

    const paginationContext = options?.paginate
      ? buildChannexPayloadPreviewPaginationContext({
          normalizedDateFrom,
          normalizedDateTo,
          pageDateFrom: options.pageDateFrom,
          pageSizeDays: options.pageSizeDays,
        })
      : {
          pageDateFrom: normalizedDateFrom,
          pageDateTo: normalizedDateTo,
          pagination: null,
        };
    if (paginationContext.error) return paginationContext.error;

    try {
      const previewResult = await this.previewChannexAri(
        normalizedUserId,
        normalizedDomitsPropertyId,
        paginationContext.pageDateFrom,
        paginationContext.pageDateTo
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
          pagination: paginationContext.pagination,
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
        baseAvailability: item.baseAvailability,
        activeBookingCount: item.activeBookingCount,
        sellableUnitCount: item.sellableUnitCount,
        availableUnitCount: item.availableUnitCount,
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
        pagination: paginationContext.pagination,
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

  async previewChannexAvailabilityPayloads(userId, domitsPropertyId, dateFrom, dateTo) {
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
      const notes = createChannexAvailabilityPayloadPreviewNotes();
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          pagination: null,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
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

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [availabilityWindows, calendarOverrides] = await Promise.all([
        getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
      ]);

      const normalizedAvailabilityWindows = normalizeAvailabilityWindows(availabilityWindows);
      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const occupancyContext = await buildAvailabilityOccupancyContext({
        bookingAvailabilityRepository: this.bookingAvailabilityRepository,
        domitsPropertyId: normalizedDomitsPropertyId,
        dates,
      });
      const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
        dates,
        overrideMap,
        normalizedAvailabilityWindows,
        readiness,
        normalizedDomitsPropertyId,
        activeCountsByNight: occupancyContext.activeCountsByNight,
      }).map((item) => ({
        externalPropertyId: item.externalPropertyId,
        externalRoomTypeId: item.externalRoomTypeId,
        date: item.date,
        availability: item.availability,
        baseAvailability: item.baseAvailability,
        activeBookingCount: item.activeBookingCount,
        sellableUnitCount: item.sellableUnitCount,
        availableUnitCount: item.availableUnitCount,
      }));
      const availabilityPayloadGroups = buildAvailabilityPayloadGroups(availabilityItems);

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        pagination: null,
        ready: true,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        sourceSummary: {
          propertyAvailabilityWindows: normalizedAvailabilityWindows.length,
          calendarOverrides: overrideMap.size,
          requestedDays: dates.length,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings.length : 0,
          availabilityPayloadGroups: availabilityPayloadGroups.length,
          availabilityPayloadItems: availabilityItems.length,
          bookingAwareAvailability: true,
          activeBookingCount: occupancyContext.activeBookingCount,
          activeBookingNightCount: occupancyContext.activeBookingNightCount,
          sellableUnitCount: CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT,
        },
        availabilityPayloadPreview: {
          items: availabilityItems,
          groupedPayloads: availabilityPayloadGroups,
        },
        restrictionRatePayloadPreview: {
          items: [],
          groupedPayloads: [],
        },
        notes,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to build Channex availability payload preview.",
        errorCode: "CHANNEX_AVAILABILITY_PAYLOAD_PREVIEW_FAILED",
        details,
      });
    }
  }

  async previewChannexRestrictionRatePayloads(userId, domitsPropertyId, dateFrom, dateTo) {
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
      const notes = createChannexRestrictionRatePayloadPreviewNotes();
      if (!readiness.ready) {
        return ok({
          channel: readiness.channel || "CHANNEX",
          integrationAccountId: readiness.integrationAccountId || null,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          pagination: null,
          ready: false,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
          propertyMapping: readiness.propertyMapping || null,
          roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
          ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
          sourceSummary: null,
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

      const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
      const endDateInt = isoDateToCalendarInt(normalizedDateTo);
      const [calendarOverrides, pricing, restrictions] = await Promise.all([
        getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        getPropertyPricing(normalizedDomitsPropertyId),
        getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
      ]);

      const overrideMap = buildCalendarOverrideMap(calendarOverrides);
      const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
      const restrictionMapping = buildChannexRestrictionMapping(normalizedRestrictions);
      const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
      const calendarRestrictionOverrideDates = Array.from(overrideMap.values()).filter(
        (override) => buildCalendarRestrictionOverrideSummary(override).hasAnyValue
      ).length;
      const {
        restrictionRateItems,
        supportedCalendarRestrictionOverrideFields,
        effectiveChannexRestrictionFields,
      } = buildRestrictionRateItemsFromReadiness({
        dates,
        overrideMap,
        restrictionMapping,
        pricing,
        readiness,
        normalizedDomitsPropertyId,
        normalizedRestrictions,
      });
      const restrictionRatePayloadGroups = buildRestrictionRatePayloadGroups(restrictionRateItems);
      const sourceSummary = {
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
        requestedDays: dates.length,
        ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
        restrictionRatePayloadGroups: restrictionRatePayloadGroups.length,
        restrictionRatePayloadItems: restrictionRateItems.length,
      };

      appendChannexAriPayloadPreviewNotes(notes, { sourceSummary });

      return ok({
        channel: readiness.channel || "CHANNEX",
        integrationAccountId: readiness.integrationAccountId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        pagination: null,
        ready: true,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        sourceSummary,
        availabilityPayloadPreview: {
          items: [],
          groupedPayloads: [],
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
        error: "Failed to build Channex restriction/rate payload preview.",
        errorCode: "CHANNEX_RESTRICTION_RATE_PAYLOAD_PREVIEW_FAILED",
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

  async listChannexBookingRevisions(userId, options = {}) {
    return this.channexBookingRevisionImportService.listChannexBookingRevisions(userId, options);
  }

  buildChannexCertificationCancelSkippedEvidence({ booking, reason }) {
    const bridgeBooking = toBookingAvailabilityBridgeBooking(booking);
    return {
      bookingId: bridgeBooking?.id ?? null,
      trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      syncType: "booking-availability",
      domitsPropertyId: bridgeBooking?.property_id ?? null,
      channexPropertyId: null,
      externalRoomTypeId: null,
      countOfRooms: null,
      countOfRoomsSource: null,
      affectedDateRange: { dateFrom: null, dateTo: null },
      affectedDates: [],
      availabilityValuesSent: [],
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      skipped: true,
      reason,
    };
  }

  async cancelChannexCertificationBooking(userId, domitsPropertyId, body = {}) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const bookingId = requireStr(body?.bookingId);

    if (!normalizedUserId) {
      return bad(400, { error: "Missing required query param: userId" });
    }

    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }

    if (!bookingId) {
      return bad(400, { error: "Missing bookingId." });
    }

    const bookingBefore = await this.externalBookingImportRepository.getBookingById(bookingId);
    if (!bookingBefore) {
      return bad(404, { error: "Booking not found." });
    }

    if (requireStr(bookingBefore.propertyId) !== normalizedDomitsPropertyId) {
      return bad(403, {
        error: "BOOKING_PROPERTY_MISMATCH",
        message: "Booking does not belong to the requested Domits property.",
      });
    }

    const alreadyCancelled = isCancelledDomitsBooking(bookingBefore);
    const bookingAfter = alreadyCancelled
      ? bookingBefore
      : await this.externalBookingImportRepository.cancelImportedBooking(bookingId);

    if (!bookingAfter) {
      return bad(500, {
        error: "DOMITS_BOOKING_CANCEL_FAILED",
        message: "Domits booking could not be cancelled for the Channex certification admin action.",
      });
    }

    let channexAvailabilitySync = null;
    if (alreadyCancelled) {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_ALREADY_CANCELLED",
      });
    } else if (isActiveDomitsBookingForChannexCancel(bookingBefore)) {
      channexAvailabilitySync = await this.channexBookingAvailabilityBridge.syncAvailabilityForBookingChange({
        userId: bookingBefore.hostId,
        bookingBefore: toBookingAvailabilityBridgeBooking(bookingBefore),
        bookingAfter: toBookingAvailabilityBridgeBooking(bookingAfter),
        trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
      });
    } else {
      channexAvailabilitySync = this.buildChannexCertificationCancelSkippedEvidence({
        booking: bookingAfter,
        reason: "BOOKING_STATUS_NOT_ACTIVE_FOR_CHANNEX_CANCEL",
      });
    }

    return ok({
      channel: CHANNEL_CHANNEX,
      action: CHANNEX_CERTIFICATION_CANCEL_ACTION,
      mode: CHANNEX_CERTIFICATION_CANCEL_MODE,
      bookingId,
      domitsPropertyId: normalizedDomitsPropertyId,
      requestedByUserId: normalizedUserId,
      previousStatus: bookingBefore.status ?? null,
      status: bookingAfter.status ?? CHANNEX_CANCELLED_BOOKING_STATUS,
      alreadyCancelled,
      refundProcessed: false,
      refundSkippedReason: CHANNEX_CERTIFICATION_CANCEL_REFUND_SKIPPED_REASON,
      reason: requireStr(body?.reason),
      booking: bookingAfter,
      channexAvailabilitySync,
    });
  }

  async receiveChannexBookingRevisions(userId, domitsPropertyId, options = {}) {
    return this.channexBookingRevisionImportService.receiveChannexBookingRevisions(
      userId,
      domitsPropertyId,
      options
    );
  }

  async pullLatestChannexBookingsForResolvedContext(context) {
    return this.channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext(context);
  }

  async pullLatestChannexBookings(userId, domitsPropertyId, options = {}) {
    return this.channexBookingRevisionImportService.pullLatestChannexBookings(
      userId,
      domitsPropertyId,
      options
    );
  }

  async pollLatestChannexBookings(options = {}) {
    return this.channexBookingPollingService.pollLatestChannexBookings(options);
  }

  async acknowledgeChannexBookingRevisions(userId, domitsPropertyId, body = {}, options = {}) {
    return this.channexBookingRevisionImportService.acknowledgeChannexBookingRevisions(
      userId,
      domitsPropertyId,
      body,
      options
    );
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
    summarizeEvidencePayloads = false,
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
        groupedOutboundPayloadSnapshot: summarizeEvidencePayloads
          ? summarizeChannexGroupedPayloads(transformedPayloads)
          : transformedPayloads,
        providerResponseSummary: {
          requestCount: transformedPayloads.length,
          results: response.response.results,
        },
        taskIds: collectTaskIdsFromResultList(response.response.results),
        warnings: collectWarningsFromResultList(response.response.results),
        errors: collectErrorsFromResultList(response.response.results),
        notes: baseNotes,
        rawDetails: {
          payloadPreview: summarizeEvidencePayloads
            ? summarizePayloadPreviewForEvidence(payloadPreview)
            : payloadPreview,
          providerResult: {
            success: !!providerResult?.success,
            resultCount: results.length,
            results: response.response.results,
            rawRequestBodiesOmitted: true,
          },
        },
      },
    };
  }

  logChannexPreviewPayloadSyncStage(stage, logContext, fields = {}) {
    if (!logContext) return;
    logChannexRestrictionsSync(stage, {
      ...logContext,
      ...fields,
    });
  }

  async resolveChannexPreviewPayloadResult({
    buildPayloadPreview,
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    if (typeof buildPayloadPreview === "function") {
      return await buildPayloadPreview(
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo
      );
    }

    return await this.previewChannexAriPayloads(
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo
    );
  }

  logChannexPreviewPayloadGenerated(logContext, payloadPreviewResult) {
    this.logChannexPreviewPayloadSyncStage("after_payload_generation", logContext, {
      statusCode: payloadPreviewResult?.statusCode ?? null,
      ready: payloadPreviewResult?.response?.ready ?? null,
      restrictionRatePayloadGroups: Array.isArray(
        payloadPreviewResult?.response?.restrictionRatePayloadPreview?.groupedPayloads
      )
        ? payloadPreviewResult.response.restrictionRatePayloadPreview.groupedPayloads.length
        : null,
      restrictionRatePayloadItems: Array.isArray(payloadPreviewResult?.response?.restrictionRatePayloadPreview?.items)
        ? payloadPreviewResult.response.restrictionRatePayloadPreview.items.length
        : null,
    });
  }

  buildChannexPreviewPayloadSyncMetadata(payloadPreview, baseNotes) {
    return {
      notes: [...(Array.isArray(payloadPreview.notes) ? payloadPreview.notes : []), ...baseNotes],
      mappingSnapshot: {
        missingMappings: Array.isArray(payloadPreview.missingMappings) ? payloadPreview.missingMappings : [],
        sourceSummary: payloadPreview.sourceSummary ?? null,
      },
    };
  }

  buildChannexPreviewSyncPayloads({ groupedPayloads, buildPayloads, afterBuildPayloads, notes }) {
    const transformedPayloads = buildPayloads(groupedPayloads);
    if (typeof afterBuildPayloads !== "function") return transformedPayloads;

    const nextTransformedPayloads = afterBuildPayloads({ baseNotes: notes, transformedPayloads });
    return Array.isArray(nextTransformedPayloads) ? nextTransformedPayloads : transformedPayloads;
  }

  captureChannexPreviewSyncPayloads({ captureState, summarizeEvidencePayloads, transformedPayloads }) {
    if (!captureState) return;
    captureState.groupedOutboundPayloadSnapshot = summarizeEvidencePayloads
      ? summarizeChannexGroupedPayloads(transformedPayloads)
      : transformedPayloads;
  }

  applyChannexPreviewProviderFailureStatus({
    providerSyncResult,
    providerFailureStatusCode,
    syncErrorCode,
    syncErrorMessage,
  }) {
    if (!providerFailureStatusCode || !resultListHasErrors(providerSyncResult.response?.response?.results)) return;
    providerSyncResult.response = bad(providerFailureStatusCode, {
      ...providerSyncResult.response.response,
      error: syncErrorMessage,
      errorCode: syncErrorCode,
    });
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
    buildPayloadPreview = null,
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
    summarizeEvidencePayloads = false,
    providerFailureStatusCode = null,
    logContext = null,
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
      this.logChannexPreviewPayloadSyncStage("before_payload_generation", logContext, {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
      });
      const payloadPreviewResult = await this.resolveChannexPreviewPayloadResult({
        buildPayloadPreview,
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      this.logChannexPreviewPayloadGenerated(logContext, payloadPreviewResult);
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
      const { notes, mappingSnapshot } = this.buildChannexPreviewPayloadSyncMetadata(payloadPreview, baseNotes);

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

      const transformedPayloads = this.buildChannexPreviewSyncPayloads({
        groupedPayloads,
        buildPayloads,
        afterBuildPayloads,
        notes,
      });
      this.captureChannexPreviewSyncPayloads({
        captureState,
        summarizeEvidencePayloads,
        transformedPayloads,
      });

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
        groupedPayloads: summarizeEvidencePayloads
          ? summarizeChannexGroupedPayloads(transformedPayloads)
          : transformedPayloads,
        baseNotes: notes,
        payloadPreview: summarizeEvidencePayloads
          ? summarizePayloadPreviewForEvidence(payloadPreview)
          : payloadPreview,
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
        summarizeEvidencePayloads,
      });
      this.applyChannexPreviewProviderFailureStatus({
        providerSyncResult,
        providerFailureStatusCode,
        syncErrorCode,
        syncErrorMessage,
      });
      return await finalize(providerSyncResult.response, providerSyncResult.evidencePatch);
    } catch (error) {
      const details = describeLocalError(error);
      this.logChannexPreviewPayloadSyncStage("service_catch", logContext, {
        errorCode: syncErrorCode,
        details,
      });
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

  buildChannexCalendarChangeContext(body = {}) {
    const startedAt = nowMs();
    return {
      startedAt,
      normalizedUserId: requireStr(body?.userId),
      normalizedDomitsPropertyId: requireStr(body?.domitsPropertyId),
      source: requireStr(body?.source) || "HOST_CALENDAR_CHANGED",
      changeTypes: normalizeChannexCalendarChangeTypes(body?.changeTypes),
      dateContext: buildChannexCalendarChangeDateContext(body),
      rawDateFrom: body?.dateFrom,
      rawDateTo: body?.dateTo,
    };
  }

  createChannexCalendarChangeFinalizer(context, options) {
    return this.createChannexSyncFinalizer({
      normalizedUserId: context.normalizedUserId,
      normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
      normalizedDateFrom: context.dateContext.dateFrom,
      normalizedDateTo: context.dateContext.dateTo,
      rawDateFrom: context.rawDateFrom,
      rawDateTo: context.rawDateTo,
      startedAt: context.startedAt,
      syncType: CHANNEX_CALENDAR_CHANGE_SYNC_TYPE,
      options,
    });
  }

  buildChannexCalendarChangeValidationFailure(context) {
    if (!context.normalizedUserId) {
      return {
        response: bad(400, { error: "Missing required field: userId" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [{ errorCode: "MISSING_USER_ID", errorMessage: "Missing required field: userId" }],
        },
      };
    }
    if (!context.normalizedDomitsPropertyId) {
      return {
        response: bad(400, { error: "Missing required field: domitsPropertyId" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            { errorCode: "MISSING_DOMITS_PROPERTY_ID", errorMessage: "Missing required field: domitsPropertyId" },
          ],
        },
      };
    }
    if (
      !context.dateContext.dateFrom ||
      !context.dateContext.dateTo ||
      context.dateContext.dateFrom > context.dateContext.dateTo
    ) {
      return {
        response: bad(400, { error: "Invalid or missing calendar-change date range." }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_DATE_RANGE_INVALID",
              errorMessage: "Calendar-change sync needs changedDates or a valid dateFrom/dateTo range.",
            },
          ],
        },
      };
    }
    const validationFailure = buildSyncDateRangeValidationFailure({
      normalizedUserId: context.normalizedUserId,
      normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
      normalizedDateFrom: context.dateContext.dateFrom,
      normalizedDateTo: context.dateContext.dateTo,
    });
    if (validationFailure) return validationFailure;
    if (!context.changeTypes.length) {
      return {
        response: bad(400, { error: "Missing required field: changeTypes" }),
        evidencePatch: {
          status: "INVALID_REQUEST",
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_TYPES_MISSING",
              errorMessage: "Calendar-change sync needs at least one supported change type.",
            },
          ],
        },
      };
    }
    return null;
  }

  getChannexCalendarChangeBaseNotes() {
    return [
      "Host calendar change-only sync. This endpoint sends only the Channex provider payloads needed for the changed calendar fields.",
      "Availability values are rebuilt from Domits effective availability, including active booking occupancy, before sending to Channex.",
    ];
  }

  buildChannexCalendarChangeBlockedResult({ readiness, context, baseNotes, mappingSnapshot }) {
    const response = ok({
      channel: readiness.channel || "CHANNEX",
      integrationAccountId: readiness.integrationAccountId || null,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: [],
      ready: false,
      calledProvider: false,
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
      notes: appendMissingMappingNotes(baseNotes, readiness.missingMappings),
    });
    return {
      response,
      evidencePatch: {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: { availability: [], restrictions: [] },
        providerResponseSummary: { calledProvider: false, requestCount: 0, results: [] },
        notes: response.response.notes,
        rawDetails: {
          readiness,
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
        },
      },
    };
  }

  async buildChannexCalendarChangePayloadPlan({ readiness, context }) {
    const needsAvailability = context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.AVAILABILITY);
    const needsRestrictionsOrRates =
      context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RESTRICTIONS) ||
      context.changeTypes.includes(CHANNEX_CALENDAR_CHANGE_TYPES.RATES);
    const availabilityContext = needsAvailability
      ? await this.buildChannexFullSyncAvailabilityPayloadContext({
          readiness,
          normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
          normalizedDateFrom: context.dateContext.dateFrom,
          normalizedDateTo: context.dateContext.dateTo,
        })
      : null;
    const fullPayloadContext = needsRestrictionsOrRates
      ? await this.buildChannexFullSyncPayloadContext({
          readiness,
          normalizedDomitsPropertyId: context.normalizedDomitsPropertyId,
          normalizedDateFrom: context.dateContext.dateFrom,
          normalizedDateTo: context.dateContext.dateTo,
        })
      : null;
    const availabilityPayloads = needsAvailability
      ? filterChannexPayloadValuesByDate(
          availabilityContext?.availabilityProviderPayloads,
          context.dateContext.exactDateSet
        )
      : [];
    const restrictionPayloads = needsRestrictionsOrRates
      ? buildChannexCalendarRestrictionSyncPayloads({
          payloads: fullPayloadContext?.restrictionProviderPayloads,
          changeTypes: context.changeTypes,
          exactDateSet: context.dateContext.exactDateSet,
        })
      : [];
    return {
      availabilityContext,
      fullPayloadContext,
      availabilityPayloads,
      restrictionPayloads,
      requestTypes: [
        ...(availabilityPayloads.length ? ["availability"] : []),
        ...(restrictionPayloads.length ? ["restrictions/rates"] : []),
      ],
    };
  }

  buildChannexCalendarChangeNoopResult({ readiness, context, baseNotes, mappingSnapshot, payloadPlan }) {
    const response = ok({
      channel: "CHANNEX",
      integrationAccountId: readiness.integrationAccountId ?? null,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: [],
      ready: true,
      calledProvider: false,
      requestCount: 0,
      taskIds: [],
      warnings: [],
      errors: [],
      overallSuccess: false,
      notes: [
        ...baseNotes,
        "No Channex provider values were generated for the requested host calendar change.",
      ],
    });
    return {
      response,
      evidencePatch: {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "NOOP",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: { availability: [], restrictions: [] },
        providerResponseSummary: { calledProvider: false, requestCount: 0, results: [] },
        notes: response.response.notes,
        rawDetails: {
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
          availabilityPayloadSummary: payloadPlan.availabilityContext?.availabilityPayloadSummary ?? [],
          restrictionsPayloadSummary: payloadPlan.fullPayloadContext?.restrictionsPayloadSummary ?? [],
        },
      },
    };
  }

  async pushChannexCalendarChangeStep({ secret, step, payloads, options }) {
    const providerResult =
      step === "availability"
        ? await this.channexProviderClient.pushAvailability(secret, payloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          })
        : await this.channexProviderClient.pushRestrictions(secret, payloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          });
    const formatter =
      step === "availability" ? formatChannexAvailabilityProviderResult : formatChannexRestrictionProviderResult;
    const results = (Array.isArray(providerResult?.results) ? providerResult.results : []).map(formatter);
    return {
      step: step === "availability" ? "availability" : "restrictions/rates",
      requestCount: payloads.length,
      results,
      taskIds: collectTaskIdsFromResultList(results),
      warnings: collectWarningsFromResultList(results),
      errors: collectErrorsFromResultList(results),
    };
  }

  async collectChannexCalendarChangeProviderSteps({ secret, payloadPlan, options }) {
    const steps = [];
    if (payloadPlan.availabilityPayloads.length) {
      steps.push(
        await this.pushChannexCalendarChangeStep({
          secret,
          step: "availability",
          payloads: payloadPlan.availabilityPayloads,
          options,
        })
      );
    }
    if (payloadPlan.restrictionPayloads.length) {
      steps.push(
        await this.pushChannexCalendarChangeStep({
          secret,
          step: "restrictions",
          payloads: payloadPlan.restrictionPayloads,
          options,
        })
      );
    }
    return steps;
  }

  buildChannexCalendarChangeProviderResult({ integration, context, baseNotes, mappingSnapshot, payloadPlan, providerSteps }) {
    const allResults = providerSteps.flatMap((step) => step.results);
    const taskIds = collectTaskIdsFromResultList(allResults);
    const warnings = collectWarningsFromResultList(allResults);
    const errors = collectErrorsFromResultList(allResults);
    const hasErrors = resultListHasErrors(allResults);
    const hasWarnings = resultListHasWarnings(allResults);
    const overallSuccess = !hasErrors && !hasWarnings;
    const requestCount = payloadPlan.availabilityPayloads.length + payloadPlan.restrictionPayloads.length;
    const responseBody = {
      channel: "CHANNEX",
      integrationAccountId: integration.id,
      domitsPropertyId: context.normalizedDomitsPropertyId,
      source: context.source,
      syncType: CHANNEX_CALENDAR_CHANGE_SYNC_TYPE,
      dateFrom: context.dateContext.dateFrom,
      dateTo: context.dateContext.dateTo,
      changedDates: context.dateContext.changedDates,
      changeTypes: context.changeTypes,
      requestTypes: payloadPlan.requestTypes,
      ready: true,
      calledProvider: true,
      requestCount,
      taskIds,
      warnings,
      errors,
      overallSuccess,
      steps: providerSteps,
      notes: baseNotes,
      ...(hasErrors
        ? {
            error: "Failed to sync Channex host calendar change.",
            errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
          }
        : {}),
    };
    const response = hasErrors ? bad(500, responseBody) : ok(responseBody);
    const outcome = deriveEvidenceOutcome({
      statusCode: response.statusCode,
      ready: true,
      calledProvider: true,
      results: allResults,
      overallSuccess,
    });

    return {
      response,
      evidencePatch: {
        integrationAccountId: integration.id,
        status: outcome.status,
        overallSuccess: outcome.overallSuccess && overallSuccess,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: summarizeChannexGroupedPayloads(payloadPlan.availabilityPayloads),
          restrictions: summarizeChannexGroupedPayloads(payloadPlan.restrictionPayloads),
        },
        providerResponseSummary: {
          calledProvider: true,
          requestCount,
          requestTypes: payloadPlan.requestTypes,
          results: allResults,
          steps: providerSteps,
        },
        taskIds,
        warnings,
        errors,
        notes: baseNotes,
        rawDetails: {
          source: context.source,
          changeTypes: context.changeTypes,
          changedDates: context.dateContext.changedDates,
          activeBookingCount:
            payloadPlan.availabilityContext?.activeBookingCount ?? payloadPlan.fullPayloadContext?.activeBookingCount ?? null,
          activeBookingNightCount:
            payloadPlan.availabilityContext?.activeBookingNightCount ??
            payloadPlan.fullPayloadContext?.activeBookingNightCount ??
            null,
        },
      },
    };
  }

  async runChannexCalendarChangeSync({ context, finalize, baseNotes, options }) {
    const readinessResult = await this.getChannexAriTargets(
      context.normalizedUserId,
      context.normalizedDomitsPropertyId
    );
    if (readinessResult?.statusCode !== 200) {
      return await finalize(readinessResult, this.buildChannexAriTargetsFailureEvidencePatch(readinessResult));
    }

    const readiness = readinessResult.response || {};
    const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
    if (!readiness.ready) {
      const blocked = this.buildChannexCalendarChangeBlockedResult({
        readiness,
        context,
        baseNotes,
        mappingSnapshot,
      });
      return await finalize(blocked.response, blocked.evidencePatch);
    }

    const payloadPlan = await this.buildChannexCalendarChangePayloadPlan({ readiness, context });
    if (!payloadPlan.requestTypes.length) {
      const noop = this.buildChannexCalendarChangeNoopResult({
        readiness,
        context,
        baseNotes,
        mappingSnapshot,
        payloadPlan,
      });
      return await finalize(noop.response, noop.evidencePatch);
    }

    const credentialContext = await this.resolveChannexSyncCredentialContext({
      userId: context.normalizedUserId,
      mappingSnapshot,
      groupedPayloads: {
        availability: summarizeChannexGroupedPayloads(payloadPlan.availabilityPayloads),
        restrictions: summarizeChannexGroupedPayloads(payloadPlan.restrictionPayloads),
      },
      baseNotes,
      payloadPreview: {
        source: context.source,
        changeTypes: context.changeTypes,
        changedDates: context.dateContext.changedDates,
        dateFrom: context.dateContext.dateFrom,
        dateTo: context.dateContext.dateTo,
      },
    });
    if (!credentialContext.ok) {
      return await finalize(credentialContext.response, credentialContext.evidencePatch);
    }

    const providerSteps = await this.collectChannexCalendarChangeProviderSteps({
      secret: credentialContext.secret,
      payloadPlan,
      options,
    });
    const providerResult = this.buildChannexCalendarChangeProviderResult({
      integration: credentialContext.integration,
      context,
      baseNotes,
      mappingSnapshot,
      payloadPlan,
      providerSteps,
    });
    return await finalize(providerResult.response, providerResult.evidencePatch);
  }

  async syncChannexCalendarChange(body = {}, options = {}) {
    const context = this.buildChannexCalendarChangeContext(body);
    const finalize = this.createChannexCalendarChangeFinalizer(context, options);
    const validationFailure = this.buildChannexCalendarChangeValidationFailure(context);
    if (validationFailure) {
      return await finalize(validationFailure.response, validationFailure.evidencePatch);
    }

    const baseNotes = this.getChannexCalendarChangeBaseNotes();
    try {
      return await this.runChannexCalendarChangeSync({
        context,
        finalize,
        baseNotes,
        options,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to sync Channex host calendar change.",
          errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_CALENDAR_CHANGE_SYNC_FAILED",
              errorMessage: "Failed to sync Channex host calendar change.",
              details,
            },
          ],
          rawDetails: {
            caughtError: details,
            source: context.source,
            changeTypes: context.changeTypes,
            changedDates: context.dateContext.changedDates,
          },
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
      buildPayloadPreview: (...args) => this.previewChannexAvailabilityPayloads(...args),
      selectGroupedPayloads: (payloadPreview) =>
        Array.isArray(payloadPreview?.availabilityPayloadPreview?.groupedPayloads)
          ? payloadPreview.availabilityPayloadPreview.groupedPayloads
          : [],
      buildPayloads: buildChannexAvailabilitySyncPayloads,
      afterBuildPayloads: ({ baseNotes, transformedPayloads }) => {
        const combinedPayloads = combineChannexAvailabilitySyncPayloadsForProvider(transformedPayloads);
        if (combinedPayloads.length) {
          baseNotes.push(
            `Availability sync combined ${transformedPayloads.length} room-type payload group(s) into one Channex availability request containing ${combinedPayloads[0].values.length} values.`
          );
        }
        return combinedPayloads;
      },
      noopStage: "beforeTransform",
      isNoop: ({ groupedPayloads }) => !groupedPayloads.length,
      noopNote: "No availability payload groups were generated, so nothing was sent to Channex.",
      providerCall: (secret, transformedPayloads) =>
        this.channexProviderClient.pushAvailability(secret, transformedPayloads, {
          requestTimeoutMs: options?.providerRequestTimeoutMs,
          stopOnFailure: true,
        }),
      formatProviderResult: formatChannexAvailabilityProviderResult,
      syncErrorCode: "CHANNEX_AVAILABILITY_SYNC_FAILED",
      syncErrorMessage: "Failed to sync Channex availability.",
      summarizeEvidencePayloads: true,
      providerFailureStatusCode: 500,
    });
  }

  async syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    logChannexRestrictionsSync("service_entry", {
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
    });

    try {
      const result = await this.runChannexPreviewPayloadSync({
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        options,
        syncType: "restrictions",
        baseNotes: [
          "Manual staging sync only. This endpoint sends rate updates through Channex restrictions and does not run a scheduler, retries, or sync-state persistence.",
          "Restrictions sync sends Channex rate values and can add supported mapped fields: stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay.",
        ].filter(Boolean),
        previewErrorCode: "CHANNEX_RESTRICTIONS_PREVIEW_FAILED",
        previewErrorMessage: "Failed to build restrictions payload preview.",
        buildPayloadPreview: (...args) => this.previewChannexRestrictionRatePayloads(...args),
        selectGroupedPayloads: (payloadPreview) =>
          Array.isArray(payloadPreview?.restrictionRatePayloadPreview?.groupedPayloads)
            ? payloadPreview.restrictionRatePayloadPreview.groupedPayloads
            : [],
        buildPayloads: buildChannexRestrictionSyncPayloads,
        afterBuildPayloads: ({ baseNotes, transformedPayloads }) => {
          appendRestrictionSyncOutboundNotes(baseNotes, transformedPayloads);
          const combinedPayloads = combineChannexRestrictionSyncPayloadsForProvider(transformedPayloads);
          if (combinedPayloads.length) {
            baseNotes.push(
              `Restrictions sync combined ${transformedPayloads.length} rate-plan payload group(s) into one Channex restrictions request containing ${combinedPayloads[0].values.length} values.`
            );
            logChannexRestrictionsSync("after_request_planning", {
              sourceGroupCount: transformedPayloads.length,
              requestCount: combinedPayloads.length,
              totalValueCount: combinedPayloads.reduce(
                (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
                0
              ),
            });
          }
          return combinedPayloads;
        },
        isNoop: ({ transformedPayloads }) => !transformedPayloads.length,
        noopNote: "No nightlyPrice values or supported restriction fields were available to send, so nothing was posted to Channex.",
        providerCall: (secret, transformedPayloads) =>
          this.channexProviderClient.pushRestrictions(secret, transformedPayloads, {
            requestTimeoutMs: options?.providerRequestTimeoutMs,
            stopOnFailure: true,
          }),
        formatProviderResult: formatChannexRestrictionProviderResult,
        syncErrorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        syncErrorMessage: "Failed to sync Channex restrictions.",
        summarizeEvidencePayloads: true,
        providerFailureStatusCode: 500,
        logContext: {
          action: "syncChannexRestrictions",
        },
      });

      return addChannexRestrictionsSyncVersion(result);
    } catch (error) {
      const details = describeLocalError(error);
      logChannexRestrictionsSync("service_outer_catch", {
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
        details,
      });
      return bad(500, {
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        error: "Failed to sync Channex restrictions.",
        errorCode: "CHANNEX_RESTRICTIONS_SYNC_FAILED",
        details,
      });
    }
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

  normalizeChannexFullSyncDateContext(dateFrom, dateTo) {
    const rawDateFrom = requireStr(dateFrom);
    const rawDateTo = requireStr(dateTo);
    const usingDefaultDateRange = !rawDateFrom && !rawDateTo;
    const defaultStartDate = usingDefaultDateRange ? getUtcTodayIsoDate() : null;

    return {
      rawDateFrom,
      rawDateTo,
      usingDefaultDateRange,
      normalizedDateFrom: usingDefaultDateRange ? defaultStartDate : parseIsoDateParam(rawDateFrom),
      normalizedDateTo: usingDefaultDateRange
        ? addDaysToIsoDate(defaultStartDate, CHANNEX_CERTIFICATION_FULL_SYNC_DAYS - 1)
        : parseIsoDateParam(rawDateTo),
    };
  }

  async buildChannexFullSyncPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
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
    const occupancyContext = await buildAvailabilityOccupancyContext({
      bookingAvailabilityRepository: this.bookingAvailabilityRepository,
      domitsPropertyId: normalizedDomitsPropertyId,
      dates,
    });

    const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
      dates,
      overrideMap,
      normalizedAvailabilityWindows,
      readiness,
      normalizedDomitsPropertyId,
      activeCountsByNight: occupancyContext.activeCountsByNight,
    });
    const availabilityGroupedPayloads = buildAvailabilityPayloadGroups(availabilityItems);
    const availabilityProviderPayloads = combineChannexAvailabilitySyncPayloadsForProvider(
      buildChannexAvailabilitySyncPayloads(availabilityGroupedPayloads)
    );

    const {
      restrictionRateItems,
      supportedCalendarRestrictionOverrideFields,
      effectiveChannexRestrictionFields,
    } = buildRestrictionRateItemsFromReadiness({
      dates,
      overrideMap,
      restrictionMapping,
      pricing,
      readiness,
      normalizedDomitsPropertyId,
      normalizedRestrictions,
      includeSnapshotBooleanRestrictions: true,
    });
    const restrictionRateGroupedPayloads = buildRestrictionRatePayloadGroups(restrictionRateItems);
    const restrictionProviderPayloads = combineChannexRestrictionSyncPayloadsForProvider(
      buildChannexRestrictionSyncPayloads(restrictionRateGroupedPayloads)
    );

    return {
      dates,
      availabilityItems,
      availabilityGroupedPayloads,
      availabilityProviderPayloads,
      restrictionRateItems,
      restrictionRateGroupedPayloads,
      restrictionProviderPayloads,
      supportedCalendarRestrictionOverrideFields: Array.from(supportedCalendarRestrictionOverrideFields).sort(
        compareAlphabetically
      ),
      effectiveChannexRestrictionFields: Array.from(effectiveChannexRestrictionFields).sort(compareAlphabetically),
      sentChannexRestrictionFields: collectChannexRestrictionFieldsFromGroups(restrictionProviderPayloads),
      bookingAwareAvailability: true,
      activeBookingCount: occupancyContext.activeBookingCount,
      activeBookingNightCount: occupancyContext.activeBookingNightCount,
      availabilityPayloadSummary: summarizeChannexGroupedPayloads(availabilityProviderPayloads),
      restrictionsPayloadSummary: summarizeChannexGroupedPayloads(restrictionProviderPayloads),
    };
  }

  async buildChannexFullSyncAvailabilityPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
    const [availabilityWindows, calendarOverrides] = await Promise.all([
      getPropertyAvailabilityWindows(normalizedDomitsPropertyId),
      getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
    ]);
    const occupancyContext = await buildAvailabilityOccupancyContext({
      bookingAvailabilityRepository: this.bookingAvailabilityRepository,
      domitsPropertyId: normalizedDomitsPropertyId,
      dates,
    });
    const availabilityItems = buildAvailabilityPayloadItemsFromReadiness({
      dates,
      overrideMap: buildCalendarOverrideMap(calendarOverrides),
      normalizedAvailabilityWindows: normalizeAvailabilityWindows(availabilityWindows),
      readiness,
      normalizedDomitsPropertyId,
      activeCountsByNight: occupancyContext.activeCountsByNight,
    });
    const availabilityGroupedPayloads = buildAvailabilityPayloadGroups(availabilityItems);
    const availabilityProviderPayloads = combineChannexAvailabilitySyncPayloadsForProvider(
      buildChannexAvailabilitySyncPayloads(availabilityGroupedPayloads)
    );

    return {
      dates,
      availabilityItems,
      availabilityGroupedPayloads,
      availabilityProviderPayloads,
      bookingAwareAvailability: true,
      activeBookingCount: occupancyContext.activeBookingCount,
      activeBookingNightCount: occupancyContext.activeBookingNightCount,
      availabilityPayloadSummary: summarizeChannexGroupedPayloads(availabilityProviderPayloads),
    };
  }

  async buildChannexFullSyncRestrictionsPayloadContext({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    markStage,
  }) {
    const startDateInt = isoDateToCalendarInt(normalizedDateFrom);
    const endDateInt = isoDateToCalendarInt(normalizedDateTo);
    const dates = buildCalendarDateRange(normalizedDateFrom, normalizedDateTo);
    const mark = (stageName, fields = {}) => {
      if (typeof markStage === "function") {
        markStage(stageName, fields);
      }
    };
    const loadWithStage = async (stagePrefix, loader, summarize = () => ({})) => {
      mark(`${stagePrefix}_start`);
      try {
        const value = await loader();
        mark(`${stagePrefix}_end`, summarize(value));
        return value;
      } catch (error) {
        mark(`${stagePrefix}_failed`, { details: describeLocalError(error) });
        throw error;
      }
    };

    const [calendarOverrides, pricing, restrictions] = await Promise.all([
      loadWithStage(
        "load_calendar_overrides",
        () => getPropertyCalendarOverrides(normalizedDomitsPropertyId, startDateInt, endDateInt),
        (rows) => ({ rowCount: Array.isArray(rows) ? rows.length : 0 })
      ),
      loadWithStage("load_pricing", () => getPropertyPricing(normalizedDomitsPropertyId), (row) => ({
        hasPricing: !!row,
      })),
      loadWithStage(
        "load_global_restrictions",
        () => getPropertyAvailabilityRestrictions(normalizedDomitsPropertyId),
        (rows) => ({ rowCount: Array.isArray(rows) ? rows.length : 0 })
      ),
    ]);
    mark("mapping_fan_out_start", {
      dateCount: dates.length,
      ratePlanMappingCount: Array.isArray(readiness?.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
      calendarOverrideCount: Array.isArray(calendarOverrides) ? calendarOverrides.length : 0,
      globalRestrictionCount: Array.isArray(restrictions) ? restrictions.length : 0,
      hasPricing: !!pricing,
    });
    const normalizedRestrictions = normalizeAvailabilityRestrictionRows(restrictions);
    const { restrictionRateItems } = buildRestrictionRateItemsFromReadiness({
      dates,
      overrideMap: buildCalendarOverrideMap(calendarOverrides),
      restrictionMapping: buildChannexRestrictionMapping(normalizedRestrictions),
      pricing,
      readiness,
      normalizedDomitsPropertyId,
      normalizedRestrictions,
      includeSnapshotBooleanRestrictions: true,
    });
    mark("mapping_fan_out_end", {
      itemCount: restrictionRateItems.length,
    });
    mark("value_summary_start", {
      itemCount: restrictionRateItems.length,
    });
    const restrictionRateGroupedPayloads = buildRestrictionRatePayloadGroups(restrictionRateItems);
    const restrictionProviderPayloads = combineChannexRestrictionSyncPayloadsForProvider(
      buildChannexRestrictionSyncPayloads(restrictionRateGroupedPayloads)
    );
    const sentChannexRestrictionFields = collectChannexRestrictionFieldsFromGroups(restrictionProviderPayloads);
    const restrictionsPayloadSummary = summarizeChannexGroupedPayloads(restrictionProviderPayloads);
    mark("value_summary_end", {
      groupCount: restrictionRateGroupedPayloads.length,
      requestCount: restrictionProviderPayloads.length,
      valueCount: restrictionProviderPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields,
    });

    return {
      dates,
      restrictionRateItems,
      restrictionRateGroupedPayloads,
      restrictionProviderPayloads,
      sentChannexRestrictionFields,
      restrictionsPayloadSummary,
    };
  }

  buildChannexFullSyncBaseResponse({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    stage,
  }) {
    return {
      channel: readiness?.channel || "CHANNEX",
      integrationAccountId: readiness?.integrationAccountId ?? null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
      stage,
      usedDefaultDateRange: !!usingDefaultDateRange,
      dryRun: dryRun === true,
      providerMode,
    };
  }

  async callChannexFullSyncProviderStep({ step, secret, payloads }) {
    logChannexFullCertificationSync(`${step}_provider_call_start`, {
      providerRequestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
      requestCount: Array.isArray(payloads) ? payloads.length : 0,
      payloadSummary: summarizeChannexGroupedPayloads(payloads),
    });

    const providerResult =
      step === "availability"
        ? await this.channexProviderClient.pushAvailability(secret, payloads, {
            requestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
            stopOnFailure: true,
          })
        : await this.channexProviderClient.pushRestrictions(secret, payloads, {
            requestTimeoutMs: CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS,
            stopOnFailure: true,
          });
    const rawResults = Array.isArray(providerResult?.results) ? providerResult.results : [];
    const results =
      step === "availability"
        ? rawResults.map((result) => formatChannexAvailabilityProviderResult(result))
        : rawResults.map((result) => formatChannexRestrictionProviderResult(result));

    logChannexFullCertificationSync(`${step}_provider_call_end`, {
      success: !!providerResult?.success,
      resultCount: results.length,
      taskIds: collectTaskIdsFromResultList(results),
      warnings: collectWarningsFromResultList(results),
      errors: collectErrorsFromResultList(results),
    });

    return {
      step,
      calledProvider: true,
      requestCount: Array.isArray(payloads) ? payloads.length : 0,
      success: !resultListHasErrors(results),
      taskIds: collectTaskIdsFromResultList(results),
      warnings: collectWarningsFromResultList(results),
      errors: collectErrorsFromResultList(results),
      results,
      providerResultSummary: {
        success: !!providerResult?.success,
        resultCount: rawResults.length,
        rawRequestBodiesOmitted: true,
      },
    };
  }

  buildChannexFullSyncSkippedStep(step, reason) {
    return {
      step,
      calledProvider: false,
      requestCount: 0,
      success: false,
      taskIds: [],
      warnings: [],
      errors: [
        {
          errorCode: `CHANNEX_FULL_SYNC_${step.toUpperCase()}_SKIPPED`,
          errorMessage: reason,
        },
      ],
      results: [],
      providerResultSummary: {
        success: false,
        resultCount: 0,
        rawRequestBodiesOmitted: true,
      },
    };
  }

  buildChannexFullSyncProviderPlan({ providerMode, availabilityPayloads, restrictionPayloads }) {
    const plan = [];
    if (providerMode !== "restrictionsOnly") {
      plan.push({
        step: "availability",
        payloads: availabilityPayloads,
        emptyReason: "No availability values were generated for the requested certification full-sync range.",
      });
    }
    if (providerMode !== "availabilityOnly") {
      plan.push({
        step: "restrictions",
        payloads: restrictionPayloads,
        emptyReason: "No rate or supported restriction values were generated for the requested certification full-sync range.",
      });
    }
    return plan;
  }

  buildChannexCertificationTestCasePayload({ readiness, testCase }) {
    const failures = [];
    const values = [];

    for (const update of Array.isArray(testCase?.updates) ? testCase.updates : []) {
      const updateResult = buildCertificationPayloadUpdate({ readiness, testCase, update });
      if (updateResult.failure) failures.push(updateResult.failure);
      if (Array.isArray(updateResult.values)) values.push(...updateResult.values);
    }

    if (failures.length) {
      return {
        ok: false,
        result: bad(409, {
          error: "Required Channex certification test mapping is missing.",
          errorCode: "CHANNEX_CERTIFICATION_TEST_MAPPING_MISSING",
          failures,
        }),
      };
    }

    if (!values.length) {
      return {
        ok: false,
        result: bad(400, {
          error: "Certification test case generated no values.",
          errorCode: "CHANNEX_CERTIFICATION_TEST_EMPTY_PAYLOAD",
        }),
      };
    }

    const externalPropertyIds = Array.from(
      new Set(values.map((value) => requireStr(value.property_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const externalRoomTypeIds = Array.from(
      new Set(values.map((value) => requireStr(value.room_type_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const externalRatePlanIds = Array.from(
      new Set(values.map((value) => requireStr(value.rate_plan_id)).filter(Boolean))
    ).sort(compareAlphabetically);
    const payload = {
      externalPropertyId: externalPropertyIds.length === 1 ? externalPropertyIds[0] : null,
      externalPropertyIds,
      externalRoomTypeId: externalRoomTypeIds.length === 1 ? externalRoomTypeIds[0] : null,
      externalRoomTypeIds,
      externalRatePlanId: externalRatePlanIds.length === 1 ? externalRatePlanIds[0] : null,
      externalRatePlanIds,
      values,
    };

    return {
      ok: true,
      payloads: [payload],
      dateRange: collectChannexValueDateRange(values),
    };
  }

  async syncChannexCertificationTestCase(userId, domitsPropertyId, body = {}, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const testCaseId = formatCertificationTestCaseId(body?.testCaseId ?? body?.caseId ?? body?.id);
    const testCase = testCaseId ? CHANNEX_CERTIFICATION_TEST_CASES[testCaseId] : null;

    const finalize = async (result, evidencePatch = {}, dateRange = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: testCaseId ? `certification_case_${testCaseId}` : "certification_case",
          dateFrom: dateRange.dateFrom ?? null,
          dateTo: dateRange.dateTo ?? null,
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
        errors: [{ errorCode: "MISSING_DOMITS_PROPERTY_ID", errorMessage: "Missing required query param: domitsPropertyId" }],
      });
    }
    if (!testCase) {
      return await finalize(bad(400, {
        error: "Invalid or missing certification test case ID.",
        errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_INVALID",
        supportedTestCaseIds: Object.keys(CHANNEX_CERTIFICATION_TEST_CASES),
      }), {
        status: "INVALID_REQUEST",
        errors: [
          {
            errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_INVALID",
            errorMessage: "Invalid or missing certification test case ID.",
          },
        ],
      });
    }

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return await finalize(readinessResult, this.buildChannexAriTargetsFailureEvidencePatch(readinessResult));
      }

      const readiness = readinessResult.response || {};
      const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
      const baseNotes = [
        `Channex certification test #${testCaseId}: ${testCase.title}.`,
        "Change-only update mode: only the fields required by this certification test case are included with the required identifiers and dates.",
      ];

      if (!readiness.ready) {
        const blocked = this.buildBlockedChannexMultiStepSyncResult({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom: null,
          normalizedDateTo: null,
          baseNotes,
          mappingSnapshot,
          config: {
            includeCombinedFieldsInBlockedResponse: true,
          },
          dateContext: {},
        });
        return await finalize(blocked.response, blocked.evidencePatch);
      }

      const payloadResult = this.buildChannexCertificationTestCasePayload({ readiness, testCase });
      if (!payloadResult.ok) {
        return await finalize(payloadResult.result, {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "BLOCKED",
          overallSuccess: false,
          mappingSnapshot,
          errors: payloadResult.result.response?.failures ?? [],
          notes: baseNotes,
          rawDetails: {
            readiness,
            testCaseId,
            testCase,
          },
        });
      }

      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: summarizeChannexGroupedPayloads(payloadResult.payloads),
        baseNotes,
        payloadPreview: {
          testCaseId,
          testCaseName: testCase.title,
          payloadType: testCase.payloadType,
        },
      });
      if (!credentialContext.ok) {
        return await finalize(credentialContext.response, credentialContext.evidencePatch, payloadResult.dateRange);
      }

      const { integration, secret } = credentialContext;
      const providerResult =
        testCase.payloadType === "availability"
          ? await this.channexProviderClient.pushAvailability(secret, payloadResult.payloads)
          : await this.channexProviderClient.pushRestrictions(secret, payloadResult.payloads, { stopOnFailure: true });
      const results = Array.isArray(providerResult?.results) ? providerResult.results : [];
      const formattedResults =
        testCase.payloadType === "availability"
          ? results.map((result) => formatChannexAvailabilityProviderResult(result))
          : results.map((result) => formatChannexRestrictionProviderResult(result));
      const hasWarnings = resultListHasWarnings(formattedResults);
      const hasErrors = resultListHasErrors(formattedResults) || hasWarnings;
      const responseBody = {
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        testCaseId,
        testCaseName: testCase.title,
        syncMode: "changeUpdate",
        payloadType: testCase.payloadType,
        dateFrom: payloadResult.dateRange.dateFrom,
        dateTo: payloadResult.dateRange.dateTo,
        ready: true,
        calledProvider: true,
        requestCount: payloadResult.payloads.length,
        taskIds: collectTaskIdsFromResultList(formattedResults),
        results: formattedResults,
        overallSuccess: !hasErrors,
        notes: baseNotes,
        ...(hasErrors
          ? {
              error: "Failed to run Channex certification test case.",
              errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
            }
          : {}),
      };
      const response = hasErrors ? bad(500, responseBody) : ok(responseBody);

      return await finalize(response, {
        integrationAccountId: integration.id,
        status: hasErrors ? "FAILED" : "SUCCESS",
        overallSuccess: !hasErrors,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: summarizeChannexGroupedPayloads(payloadResult.payloads),
        providerResponseSummary: {
          calledProvider: true,
          requestCount: payloadResult.payloads.length,
          results: formattedResults,
        },
        taskIds: collectTaskIdsFromResultList(formattedResults),
        warnings: collectWarningsFromResultList(formattedResults),
        errors: collectErrorsFromResultList(formattedResults),
        notes: baseNotes,
        rawDetails: {
          testCaseId,
          testCase,
          providerResult: {
            success: !!providerResult?.success,
            resultCount: results.length,
            results: formattedResults,
            rawRequestBodiesOmitted: true,
          },
        },
      }, payloadResult.dateRange);
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(bad(500, {
        error: "Failed to run Channex certification test case.",
        errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
        details,
      }), {
        status: "FAILED",
        overallSuccess: false,
        errors: [
          {
            errorCode: "CHANNEX_CERTIFICATION_TEST_CASE_SYNC_FAILED",
            errorMessage: "Failed to run Channex certification test case.",
            details,
          },
        ],
        rawDetails: { caughtError: details, testCaseId },
      });
    }
  }

  buildChannexMultiStepMappingSnapshot(readiness) {
    return {
      missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
      propertyMapping: readiness.propertyMapping ?? null,
      roomTypeMappings: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings : [],
      ratePlanMappings: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings : [],
    };
  }

  buildChannexAriTargetsFailureEvidencePatch(readinessResult) {
    const readinessResponse = readinessResult?.response || {};
    return {
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
    };
  }

  buildBlockedChannexMultiStepSyncResult({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    baseNotes,
    mappingSnapshot,
    config,
    dateContext,
  }) {
    const responseBody = {
      channel: readiness.channel || "CHANNEX",
      integrationAccountId: readiness.integrationAccountId || null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    };
    const blockedFieldsBeforeReady = config.getBlockedResponseFieldsBeforeReady?.(dateContext);
    if (blockedFieldsBeforeReady) Object.assign(responseBody, blockedFieldsBeforeReady);
    responseBody.ready = false;
    const blockedFieldsAfterReady = config.getBlockedResponseFieldsAfterReady?.(dateContext);
    if (blockedFieldsAfterReady) Object.assign(responseBody, blockedFieldsAfterReady);
    responseBody.calledProvider = false;
    responseBody.steps = {
      availability: null,
      restrictions: null,
    };
    if (config.includeCombinedFieldsInBlockedResponse) {
      Object.assign(responseBody, {
        requestCount: 0,
        taskIds: [],
        warnings: [],
        errors: [],
      });
    }
    responseBody.overallSuccess = false;
    responseBody.notes = appendMissingMappingNotes(baseNotes, readiness.missingMappings);

    const response = ok(responseBody);

    return {
      response,
      evidencePatch: {
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
          requestCount: 0,
          steps: {
            availability: null,
            restrictions: null,
          },
        },
        notes: response.response.notes,
        rawDetails: { readiness },
      },
    };
  }

  collectChannexMultiStepSyncResults({
    availabilityStep,
    restrictionsStep,
    availabilityResponse,
    restrictionsResponse,
    restrictionsOptional = false,
  }) {
    const restrictionsResults = restrictionsOptional ? restrictionsResponse?.results : restrictionsResponse.results;
    const combinedTaskIds = dedupeByJson([
      ...collectTaskIdsFromResultList(availabilityResponse.results),
      ...collectTaskIdsFromResultList(restrictionsResults),
    ]);
    const combinedWarnings = dedupeByJson([
      ...collectWarningsFromResultList(availabilityResponse.results),
      ...collectWarningsFromResultList(restrictionsResults),
    ]);
    const combinedErrors = dedupeByJson([
      ...collectErrorsFromResultList(availabilityResponse.results),
      ...collectErrorsFromResultList(restrictionsResults),
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
        { optional: restrictionsOptional }
      ),
    ]);

    return {
      combinedTaskIds,
      combinedWarnings,
      combinedErrors,
    };
  }

  buildChannexMultiStepValidationInput({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    dateContext,
    config,
  }) {
    const validationInput = {
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
    };
    const validationFields = config.getValidationFields?.(dateContext);
    if (validationFields) Object.assign(validationInput, validationFields);
    return validationInput;
  }

  buildChannexMultiStepSuccessResponseBody({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    dateContext,
    config,
    availabilityStep,
    restrictionsStep,
    availabilityResponse,
    restrictionsResponse,
    restrictionsIntegrationAccountId,
    getRestrictionsResponse,
    calledProvider,
    combinedRequestCount,
    combinedTaskIds,
    combinedWarnings,
    combinedErrors,
    overallSuccess,
    baseNotes,
  }) {
    const responseBody = {
      channel: readiness.channel || "CHANNEX",
      integrationAccountId:
        availabilityResponse.integrationAccountId ??
        restrictionsIntegrationAccountId ??
        readiness.integrationAccountId ??
        null,
      domitsPropertyId: normalizedDomitsPropertyId,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    };
    const successFieldsBeforeReady = config.getSuccessResponseFieldsBeforeReady?.(dateContext);
    if (successFieldsBeforeReady) Object.assign(responseBody, successFieldsBeforeReady);
    responseBody.ready = true;
    const successFieldsAfterReady = config.getSuccessResponseFieldsAfterReady?.(dateContext);
    if (successFieldsAfterReady) Object.assign(responseBody, successFieldsAfterReady);
    responseBody.calledProvider = calledProvider;
    responseBody.steps = {
      availability: getStepResponse(availabilityStep, availabilityResponse),
      restrictions: getRestrictionsResponse(restrictionsStep, restrictionsResponse),
    };
    if (config.includeCombinedFieldsInSuccessResponse) {
      Object.assign(responseBody, {
        requestCount: combinedRequestCount,
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
      });
    }
    responseBody.overallSuccess = overallSuccess;
    responseBody.notes = baseNotes;
    return responseBody;
  }

  buildChannexMultiStepResponse({ responseBody, combinedErrors, config }) {
    if (!config.providerFailureStatusCode || !combinedErrors.length) return ok(responseBody);
    return bad(config.providerFailureStatusCode, {
      ...responseBody,
      error: config.providerFailureMessage ?? config.catchErrorMessage,
      errorCode: config.providerFailureCode ?? config.catchErrorCode,
    });
  }

  buildChannexMultiStepRestrictionsContext({ config, restrictionsResponse }) {
    return {
      getRestrictionsResponse: config.restrictionsOptional ? getOptionalStepResponse : getStepResponse,
      getRestrictionsSummary: config.restrictionsOptional ? getOptionalStepSummary : getStepSummary,
      restrictionsIntegrationAccountId: config.restrictionsOptional
        ? restrictionsResponse?.integrationAccountId
        : restrictionsResponse.integrationAccountId,
    };
  }

  buildChannexMultiStepRawDetails({
    readiness,
    config,
    preStepContext,
    dateContext,
    availabilityStep,
    restrictionsStep,
  }) {
    const rawDetails = {
      readiness,
    };
    const rawDetailsBeforeSteps = config.getRawDetailsBeforeSteps?.(preStepContext, dateContext);
    if (rawDetailsBeforeSteps) Object.assign(rawDetails, rawDetailsBeforeSteps);
    rawDetails.availabilityStep = availabilityStep;
    rawDetails.restrictionsStep = restrictionsStep;
    const rawDetailsAfterSteps = config.getRawDetailsAfterSteps?.(dateContext);
    if (rawDetailsAfterSteps) Object.assign(rawDetails, rawDetailsAfterSteps);
    return rawDetails;
  }

  buildChannexMultiStepCaughtRawDetails({ config, dateContext, details }) {
    const rawDetails = {
      caughtError: details,
    };
    const caughtRawDetails = config.getCaughtRawDetails?.(dateContext);
    if (caughtRawDetails) Object.assign(rawDetails, caughtRawDetails);
    return rawDetails;
  }

  async runChannexMultiStepSync({ userId, domitsPropertyId, dateFrom, dateTo, options, config }) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const dateContext = config.normalizeDateRange({ dateFrom, dateTo });
    const { normalizedDateFrom, normalizedDateTo, rawDateFrom, rawDateTo } = dateContext;
    const finalize = this.createChannexSyncFinalizer({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      rawDateFrom,
      rawDateTo,
      startedAt,
      syncType: config.syncType,
      options,
    });

    const validationInput = this.buildChannexMultiStepValidationInput({
      normalizedUserId,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      dateContext,
      config,
    });
    const validationFailure = buildSyncDateRangeValidationFailure(validationInput);
    if (validationFailure) return await finalize(validationFailure.response, validationFailure.evidencePatch);

    try {
      const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
      if (readinessResult?.statusCode !== 200) {
        return await finalize(readinessResult, this.buildChannexAriTargetsFailureEvidencePatch(readinessResult));
      }

      const readiness = readinessResult.response || {};
      const baseNotes = config.createBaseNotes(dateContext);
      const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);

      if (!readiness.ready) {
        const blocked = this.buildBlockedChannexMultiStepSyncResult({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          baseNotes,
          mappingSnapshot,
          config,
          dateContext,
        });
        return await finalize(blocked.response, blocked.evidencePatch);
      }

      const preStepContext =
        (await config.beforeRunSteps?.({
          normalizedUserId,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          dateContext,
        })) || {};

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
      } = await config.runSteps({
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        baseNotes,
      });

      const { combinedTaskIds, combinedWarnings, combinedErrors } = this.collectChannexMultiStepSyncResults({
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        restrictionsOptional: config.restrictionsOptional,
      });

      const overallSuccess = config.getOverallSuccess({
        availabilityStep,
        restrictionsStep,
        availabilityCalledProvider,
        restrictionsCalledProvider,
        availabilityWarnings,
        availabilityErrors,
        restrictionsWarnings,
        restrictionsErrors,
        combinedWarnings,
        combinedErrors,
      });
      const calledProvider = availabilityCalledProvider || restrictionsCalledProvider;
      const combinedRequestCount =
        getStepRequestCount(availabilityStep, availabilityResponse) +
        getStepRequestCount(restrictionsStep, restrictionsResponse);
      const {
        getRestrictionsResponse,
        getRestrictionsSummary,
        restrictionsIntegrationAccountId,
      } = this.buildChannexMultiStepRestrictionsContext({
        config,
        restrictionsResponse,
      });

      const responseBody = this.buildChannexMultiStepSuccessResponseBody({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        dateContext,
        config,
        availabilityStep,
        restrictionsStep,
        availabilityResponse,
        restrictionsResponse,
        restrictionsIntegrationAccountId,
        getRestrictionsResponse,
        calledProvider,
        combinedRequestCount,
        combinedTaskIds,
        combinedWarnings,
        combinedErrors,
        overallSuccess,
        baseNotes,
      });
      const response = this.buildChannexMultiStepResponse({ responseBody, combinedErrors, config });

      const combinedStatus = getCombinedSyncStatus({
        overallSuccess,
        providerCalled: calledProvider,
        combinedErrors,
        combinedWarnings,
        blockNoProviderWithErrors: !!config.blockNoProviderWithErrors,
      });

      const rawDetails = this.buildChannexMultiStepRawDetails({
        readiness,
        config,
        preStepContext,
        dateContext,
        availabilityStep,
        restrictionsStep,
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
          requestCount: combinedRequestCount,
          steps: {
            availability: getStepSummary(availabilityStep, availabilityResponse),
            restrictions: getRestrictionsSummary(restrictionsStep, restrictionsResponse),
          },
        },
        taskIds: combinedTaskIds,
        warnings: combinedWarnings,
        errors: combinedErrors,
        notes: baseNotes,
        rawDetails,
      });
    } catch (error) {
      const details = describeLocalError(error);
      const rawDetails = this.buildChannexMultiStepCaughtRawDetails({ config, dateContext, details });

      return await finalize(
        bad(500, {
          ...(config.getCaughtResponseFields?.(dateContext) ?? undefined),
          error: config.catchErrorMessage,
          errorCode: config.catchErrorCode,
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: config.catchErrorCode,
              errorMessage: config.catchErrorMessage,
              details,
            },
          ],
          rawDetails,
        }
      );
    }
  }

  async syncChannexAri(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    return this.runChannexMultiStepSync({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      options,
      config: {
        syncType: "ari",
        normalizeDateRange: ({ dateFrom: rawDateFrom, dateTo: rawDateTo }) => ({
          rawDateFrom,
          rawDateTo,
          normalizedDateFrom: parseIsoDateParam(rawDateFrom),
          normalizedDateTo: parseIsoDateParam(rawDateTo),
        }),
        createBaseNotes: () => [
          "Manual staging orchestration only. This endpoint runs the existing availability sync first and the Channex restrictions sync second.",
          "Restrictions sync sends rate values and can include mapped stop_sell, closed_to_arrival, closed_to_departure, min_stay_through, and max_stay fields when supported Domits calendar/global restrictions are present.",
        ],
        runSteps: (stepContext) => this.runGatedChannexAriSteps(stepContext),
        getOverallSuccess: getAriSyncOverallSuccess,
        restrictionsOptional: true,
        catchErrorCode: "CHANNEX_ARI_SYNC_FAILED",
        catchErrorMessage: "Failed to run combined Channex ARI sync.",
      },
    });
  }

  async finalizeInvalidChannexFullSyncOptions({
    providerMode,
    rawProviderMode,
    debugStage,
    rawDebugStage,
    dryRun,
    stageLog,
    finalize,
  }) {
    if (!providerMode) {
      return await finalize(
        bad(400, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          error: "Invalid query param: providerMode.",
          errorCode: "CHANNEX_FULL_SYNC_INVALID_PROVIDER_MODE",
          supportedProviderModes: Array.from(CHANNEX_FULL_SYNC_PROVIDER_MODES),
        }),
        {
          status: "INVALID_REQUEST",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_FULL_SYNC_INVALID_PROVIDER_MODE",
              errorMessage: "Invalid query param: providerMode.",
            },
          ],
          rawDetails: { dryRun, providerMode: rawProviderMode ?? null, debugStage, stageLog },
        }
      );
    }

    if (debugStage === "INVALID") {
      return await finalize(
        bad(400, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          error: "Invalid query param: debugStage.",
          errorCode: "CHANNEX_FULL_SYNC_INVALID_DEBUG_STAGE",
          supportedDebugStages: Array.from(CHANNEX_FULL_SYNC_DEBUG_STAGES),
        }),
        {
          status: "INVALID_REQUEST",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_FULL_SYNC_INVALID_DEBUG_STAGE",
              errorMessage: "Invalid query param: debugStage.",
            },
          ],
          rawDetails: { dryRun, providerMode, debugStage: rawDebugStage ?? null, stageLog },
        }
      );
    }

    return null;
  }

  async finalizeChannexFullSyncDateValidationFailure({
    validationFailure,
    dryRun,
    providerMode,
    debugStage,
    usingDefaultDateRange,
    stageLog,
    mark,
    finalize,
  }) {
    if (!validationFailure) return null;
    mark("validation_failed", {
      errorCode: validationFailure.evidencePatch?.errors?.[0]?.errorCode ?? null,
    });
    return await finalize(
      {
        ...validationFailure.response,
        response: {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_failed",
          dryRun,
          providerMode,
          debugStage,
          ...validationFailure.response.response,
        },
      },
      {
        ...validationFailure.evidencePatch,
        rawDetails: {
          dryRun,
          providerMode,
          debugStage,
          usedDefaultDateRange: usingDefaultDateRange,
          stageLog,
        },
      }
    );
  }

  async finalizeChannexFullSyncEarlyDebugStage({
    debugStage,
    dryRun,
    providerMode,
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    stageLog,
    mark,
    finalize,
  }) {
    if (debugStage === "validateOnly") {
      return await finalize(
        ok({
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "validation_passed",
          debugStage,
          dryRun,
          providerMode,
          userId: normalizedUserId,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          selectedDays: countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo),
          calledProvider: false,
          requestCount: 0,
          debug: { stages: stageLog },
        }),
        {
          status: "DEBUG",
          overallSuccess: true,
          rawDetails: { debugStage, dryRun, providerMode, stageLog },
        }
      );
    }

    if (debugStage === "evidenceOnly") {
      mark("evidence_only_response_ready");
      return await finalize(
        ok({
          ok: true,
          route: "sync/full",
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "evidence_only_response_ready",
          debugStage,
          dryRun,
          providerMode,
          userId: normalizedUserId,
          domitsPropertyId: normalizedDomitsPropertyId,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          calledProvider: false,
          requestCount: 0,
          debug: { stages: stageLog },
        }),
        {
          status: "DEBUG",
          overallSuccess: true,
          notes: ["debugStage=evidenceOnly: persisted a minimal full-sync debug evidence record only."],
          rawDetails: { debugStage, dryRun, providerMode, stageLog },
        }
      );
    }

    return null;
  }

  buildChannexFullSyncNotes({ usingDefaultDateRange, dryRun, debugStage, providerMode }) {
    const baseNotes = createCertificationFullSyncBaseNotes(usingDefaultDateRange);
    baseNotes.push(
      `Full certification sync runtime marker: ${CHANNEX_FULL_SYNC_DEFAULTS.VERSION}.`,
      `Real non-debug full sync sends exactly one availability request and one rates/restrictions request to Channex when both payloads contain values.`,
      `Provider requests use a controlled ${CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS} ms timeout so slow Channex responses return JSON instead of hanging the API request.`
    );
    if (dryRun) {
      baseNotes.push("dryRun=true: payloads are built and summarized, but no Channex provider request is sent.");
    }
    if (debugStage) {
      baseNotes.push(`debugStage=${debugStage}: endpoint returns after the requested diagnostic stage.`);
    }
    if (providerMode !== "both") {
      baseNotes.push(`providerMode=${providerMode}: only the selected provider step is executed for live isolation.`);
    }
    return baseNotes;
  }

  async loadChannexFullSyncReadinessContext({
    normalizedUserId,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    debugStage,
    stageLog,
    mark,
    finalize,
  }) {
    const readinessResult = await this.getChannexAriTargets(normalizedUserId, normalizedDomitsPropertyId);
    if (readinessResult?.statusCode !== 200) {
      mark("mappings_failed", { statusCode: readinessResult?.statusCode ?? null });
      return {
        finalized: await finalize(
          {
            ...readinessResult,
            response: {
              fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
              stage: "mappings_failed",
              dryRun,
              providerMode,
              debugStage,
              ...(readinessResult?.response ?? undefined),
            },
          },
          {
            ...this.buildChannexAriTargetsFailureEvidencePatch(readinessResult),
            rawDetails: {
              readinessResult,
              dryRun,
              providerMode,
              debugStage,
              stageLog,
            },
          }
        ),
      };
    }

    const readiness = readinessResult.response || {};
    const mappingSnapshot = this.buildChannexMultiStepMappingSnapshot(readiness);
    const baseNotes = this.buildChannexFullSyncNotes({ usingDefaultDateRange, dryRun, debugStage, providerMode });
    mark("mappings_loaded", {
      ready: !!readiness.ready,
      integrationAccountId: readiness.integrationAccountId ?? null,
      roomTypeMappingCount: Array.isArray(readiness.roomTypeMappings) ? readiness.roomTypeMappings.length : 0,
      ratePlanMappingCount: Array.isArray(readiness.ratePlanMappings) ? readiness.ratePlanMappings.length : 0,
    });

    return { readiness, mappingSnapshot, baseNotes };
  }

  async finalizeChannexFullSyncMappingsOnlyDebug({
    debugStage,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    finalize,
  }) {
    if (debugStage !== "mappingsOnly") return null;
    return await finalize(
      ok({
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "mappings_loaded",
        }),
        ok: true,
        debugStage,
        ready: !!readiness.ready,
        calledProvider: false,
        requestCount: 0,
        mappingSnapshot,
        missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        debug: { stages: stageLog },
      }),
      {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "DEBUG",
        overallSuccess: true,
        mappingSnapshot,
        notes: baseNotes,
        rawDetails: { debugStage, dryRun, providerMode, stageLog },
      }
    );
  }

  async finalizeBlockedChannexFullSyncReadiness({
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    debugStage,
    mappingSnapshot,
    baseNotes,
    dateContext,
    stageLog,
    finalize,
  }) {
    if (readiness.ready) return null;
    const blocked = this.buildBlockedChannexMultiStepSyncResult({
      readiness,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      baseNotes,
      mappingSnapshot,
      config: {
        includeCombinedFieldsInBlockedResponse: true,
        getBlockedResponseFieldsBeforeReady: () => ({
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage: "mappings_loaded",
          usedDefaultDateRange: usingDefaultDateRange,
          dryRun,
          providerMode,
          debugStage,
        }),
        getBlockedResponseFieldsAfterReady: () => ({ blocked: true }),
      },
      dateContext,
    });
    return await finalize(blocked.response, {
      ...blocked.evidencePatch,
      rawDetails: {
        readiness: {
          ready: readiness.ready,
          missingMappings: Array.isArray(readiness.missingMappings) ? readiness.missingMappings : [],
        },
        dryRun,
        providerMode,
        debugStage,
        stageLog,
      },
    });
  }

  async finalizeChannexFullSyncPayloadOnlyDebug({
    debugStage,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    if (debugStage === "availabilityPayloadOnly") {
      mark("before_availability_payload_generation");
      const availabilityPayloadContext = await this.buildChannexFullSyncAvailabilityPayloadContext({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      mark("availability_payload_built", {
        itemCount: availabilityPayloadContext.availabilityItems.length,
        sourceGroupCount: availabilityPayloadContext.availabilityGroupedPayloads.length,
        requestCount: availabilityPayloadContext.availabilityProviderPayloads.length,
        valueCount: availabilityPayloadContext.availabilityProviderPayloads.reduce(
          (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
          0
        ),
      });
      return await finalize(
        ok({
          ...this.buildChannexFullSyncBaseResponse({
            readiness,
            normalizedDomitsPropertyId,
            normalizedDateFrom,
            normalizedDateTo,
            usingDefaultDateRange,
            dryRun,
            providerMode,
            stage: "availability_payload_built",
          }),
          ok: true,
          debugStage,
          ready: true,
          calledProvider: false,
          requestCount: 0,
          payloadSummaries: {
            availability: availabilityPayloadContext.availabilityPayloadSummary,
            restrictions: null,
          },
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        }),
        {
          integrationAccountId: readiness.integrationAccountId ?? null,
          status: "DEBUG",
          overallSuccess: true,
          mappingSnapshot,
          groupedOutboundPayloadSnapshot: {
            availability: availabilityPayloadContext.availabilityPayloadSummary,
            restrictions: null,
          },
          notes: baseNotes,
          rawDetails: { debugStage, dryRun, providerMode, payloadsOmitted: true, stageLog },
        }
      );
    }

    if (debugStage !== "restrictionsPayloadOnly") return null;
    mark("before_restrictions_payload_generation");
    const restrictionsPayloadContext = await this.buildChannexFullSyncRestrictionsPayloadContext({
      readiness,
      normalizedDomitsPropertyId,
      normalizedDateFrom,
      normalizedDateTo,
      markStage: mark,
    });
    mark("restrictions_payload_built", {
      itemCount: restrictionsPayloadContext.restrictionRateItems.length,
      sourceGroupCount: restrictionsPayloadContext.restrictionRateGroupedPayloads.length,
      requestCount: restrictionsPayloadContext.restrictionProviderPayloads.length,
      valueCount: restrictionsPayloadContext.restrictionProviderPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields: restrictionsPayloadContext.sentChannexRestrictionFields,
    });
    return await finalize(
      ok({
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "restrictions_payload_built",
        }),
        ok: true,
        debugStage,
        ready: true,
        calledProvider: false,
        requestCount: 0,
        payloadSummaries: {
          availability: null,
          restrictions: restrictionsPayloadContext.restrictionsPayloadSummary,
        },
        sentChannexRestrictionFields: restrictionsPayloadContext.sentChannexRestrictionFields,
        debug: {
          payloadsOmitted: true,
          stages: stageLog,
        },
      }),
      {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "DEBUG",
        overallSuccess: true,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: {
          availability: null,
          restrictions: restrictionsPayloadContext.restrictionsPayloadSummary,
        },
        notes: baseNotes,
        rawDetails: { debugStage, dryRun, providerMode, payloadsOmitted: true, stageLog },
      }
    );
  }

  markChannexFullSyncPayloadContextBuilt({ payloadContext, availabilityPayloads, restrictionPayloads, baseNotes, mark }) {
    mark("availability_payload_built", {
      itemCount: payloadContext.availabilityItems.length,
      sourceGroupCount: payloadContext.availabilityGroupedPayloads.length,
      requestCount: availabilityPayloads.length,
      valueCount: availabilityPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
    });
    mark("restrictions_payload_built", {
      itemCount: payloadContext.restrictionRateItems.length,
      sourceGroupCount: payloadContext.restrictionRateGroupedPayloads.length,
      requestCount: restrictionPayloads.length,
      valueCount: restrictionPayloads.reduce(
        (sum, payload) => sum + (Array.isArray(payload?.values) ? payload.values.length : 0),
        0
      ),
      sentChannexRestrictionFields: payloadContext.sentChannexRestrictionFields,
    });
    if (payloadContext.sentChannexRestrictionFields.length) {
      baseNotes.push(
        `Full sync rates/restrictions payload includes supported Channex fields when values exist: ${payloadContext.sentChannexRestrictionFields.join(", ")}.`
      );
      return;
    }
    baseNotes.push(
      "Full sync rates/restrictions payload is rate-only because no supported restriction values were available in the selected range."
    );
  }

  async finalizeChannexFullSyncPreProviderResult({
    providerPlan,
    payloadSummaries,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    const emptyPlanItems = providerPlan.filter((item) => !Array.isArray(item.payloads) || item.payloads.length === 0);
    if (emptyPlanItems.length) {
      mark("payload_validation_failed", {
        missingSteps: emptyPlanItems.map((item) => item.step),
      });
      const errors = emptyPlanItems.map((item) => ({
        errorCode: `CHANNEX_FULL_SYNC_${item.step.toUpperCase()}_PAYLOAD_EMPTY`,
        errorMessage: item.emptyReason,
      }));
      const response = bad(409, {
        ...this.buildChannexFullSyncBaseResponse({
          readiness,
          normalizedDomitsPropertyId,
          normalizedDateFrom,
          normalizedDateTo,
          usingDefaultDateRange,
          dryRun,
          providerMode,
          stage: "payload_validation_failed",
        }),
        ready: true,
        blocked: true,
        calledProvider: false,
        requestCount: 0,
        plannedRequestCount: providerPlan.length,
        taskIds: [],
        warnings: [],
        errors,
        payloadSummaries,
        overallSuccess: false,
        notes: baseNotes,
        debug: {
          payloadsOmitted: true,
          stages: stageLog,
        },
      });
      return await finalize(response, {
        integrationAccountId: readiness.integrationAccountId ?? null,
        status: "BLOCKED",
        overallSuccess: false,
        mappingSnapshot,
        groupedOutboundPayloadSnapshot: payloadSummaries,
        providerResponseSummary: {
          calledProvider: false,
          requestCount: 0,
          plannedRequestCount: providerPlan.length,
          dryRun,
          providerMode,
        },
        taskIds: [],
        warnings: [],
        errors,
        notes: baseNotes,
        rawDetails: {
          dryRun,
          providerMode,
          payloadsOmitted: true,
          stageLog,
        },
      });
    }

    if (!dryRun) return null;
    mark("dry_run_response_ready", { plannedRequestCount: providerPlan.length });
    const response = ok({
      ...this.buildChannexFullSyncBaseResponse({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        stage: "dry_run_response_ready",
      }),
      ready: true,
      blocked: false,
      calledProvider: false,
      requestCount: 0,
      plannedRequestCount: providerPlan.length,
      taskIds: [],
      warnings: [],
      errors: [],
      payloadSummaries,
      steps: {
        availability: null,
        restrictions: null,
      },
      overallSuccess: true,
      notes: baseNotes,
      debug: {
        payloadsOmitted: true,
        stages: stageLog,
      },
    });
    return await finalize(response, {
      integrationAccountId: readiness.integrationAccountId ?? null,
      status: "DRY_RUN",
      overallSuccess: true,
      mappingSnapshot,
      groupedOutboundPayloadSnapshot: payloadSummaries,
      providerResponseSummary: {
        calledProvider: false,
        requestCount: 0,
        plannedRequestCount: providerPlan.length,
        dryRun: true,
        providerMode,
      },
      taskIds: [],
      warnings: [],
      errors: [],
      notes: baseNotes,
      rawDetails: {
        dryRun: true,
        providerMode,
        payloadsOmitted: true,
        stageLog,
      },
    });
  }

  async finalizeChannexFullSyncCredentialFailure({
    credentialContext,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    payloadSummaries,
    stageLog,
    mark,
    finalize,
  }) {
    if (credentialContext.ok) return null;
    mark("credentials_load_failed", {
      statusCode: credentialContext.response?.statusCode ?? null,
    });
    return await finalize(
      {
        ...credentialContext.response,
        response: {
          ...this.buildChannexFullSyncBaseResponse({
            readiness,
            normalizedDomitsPropertyId,
            normalizedDateFrom,
            normalizedDateTo,
            usingDefaultDateRange,
            dryRun,
            providerMode,
            stage: "credentials_load_failed",
          }),
          ...(credentialContext.response?.response ?? undefined),
          ready: true,
          calledProvider: false,
          requestCount: 0,
          payloadSummaries,
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        },
      },
      {
        ...credentialContext.evidencePatch,
        groupedOutboundPayloadSnapshot: payloadSummaries,
        rawDetails: {
          dryRun,
          providerMode,
          payloadsOmitted: true,
          stageLog,
        },
      }
    );
  }

  buildChannexFullSyncStepSummary(step) {
    if (!step) return null;
    return {
      calledProvider: step.calledProvider,
      requestCount: step.requestCount,
      taskIds: step.taskIds,
      warnings: step.warnings,
      errors: step.errors,
    };
  }

  async finalizeChannexFullSyncProviderSteps({
    providerPlan,
    credentialContext,
    readiness,
    normalizedDomitsPropertyId,
    normalizedDateFrom,
    normalizedDateTo,
    usingDefaultDateRange,
    dryRun,
    providerMode,
    payloadSummaries,
    mappingSnapshot,
    baseNotes,
    stageLog,
    mark,
    finalize,
  }) {
    mark("credentials_loaded", {
      integrationAccountId: credentialContext.integration?.id ?? null,
    });
    mark("provider_calls_start", {
      requestCount: providerPlan.length,
    });
    const providerSteps = await Promise.all(
      providerPlan.map((item) =>
        this.callChannexFullSyncProviderStep({
          step: item.step,
          secret: credentialContext.secret,
          payloads: item.payloads,
        })
      )
    );
    mark("provider_calls_complete", {
      requestCount: providerSteps.reduce((sum, item) => sum + item.requestCount, 0),
      taskIds: dedupeByJson(providerSteps.flatMap((item) => item.taskIds)),
    });

    const availabilityStep = providerSteps.find((item) => item.step === "availability") ?? null;
    const restrictionsStep = providerSteps.find((item) => item.step === "restrictions") ?? null;
    const combinedTaskIds = dedupeByJson(providerSteps.flatMap((item) => item.taskIds));
    const combinedWarnings = dedupeByJson(providerSteps.flatMap((item) => item.warnings));
    const combinedErrors = dedupeByJson(providerSteps.flatMap((item) => item.errors));
    const requestCount = providerSteps.reduce((sum, item) => sum + item.requestCount, 0);
    const calledProvider = requestCount > 0;
    const overallSuccess =
      calledProvider &&
      combinedWarnings.length === 0 &&
      combinedErrors.length === 0 &&
      providerSteps.every((item) => item.success);
    const responseStage = combinedErrors.length ? "provider_completed_with_errors" : "response_ready";
    const responseBody = {
      ...this.buildChannexFullSyncBaseResponse({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        stage: responseStage,
      }),
      ready: true,
      blocked: false,
      calledProvider,
      requestCount,
      taskIds: combinedTaskIds,
      warnings: combinedWarnings,
      errors: combinedErrors,
      payloadSummaries,
      steps: {
        availability: availabilityStep,
        restrictions: restrictionsStep,
      },
      overallSuccess,
      notes: baseNotes,
      debug: {
        payloadsOmitted: true,
        stages: stageLog,
      },
    };
    const response = combinedErrors.length
      ? bad(500, {
          ...responseBody,
          error: "Channex certification full sync provider step failed.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_PROVIDER_FAILED",
        })
      : ok(responseBody);

    return await finalize(response, {
      integrationAccountId: credentialContext.integration.id,
      status: getCombinedSyncStatus({
        overallSuccess,
        providerCalled: calledProvider,
        combinedErrors,
        combinedWarnings,
        blockNoProviderWithErrors: true,
      }),
      overallSuccess,
      mappingSnapshot,
      groupedOutboundPayloadSnapshot: payloadSummaries,
      providerResponseSummary: {
        calledProvider,
        requestCount,
        dryRun,
        providerMode,
        steps: {
          availability: this.buildChannexFullSyncStepSummary(availabilityStep),
          restrictions: this.buildChannexFullSyncStepSummary(restrictionsStep),
        },
      },
      taskIds: combinedTaskIds,
      warnings: combinedWarnings,
      errors: combinedErrors,
      notes: baseNotes,
      rawDetails: {
        dryRun,
        providerMode,
        payloadsOmitted: true,
        stageLog,
        providerResultSummaries: providerSteps.map((item) => ({
          step: item.step,
          ...item.providerResultSummary,
        })),
      },
    });
  }

  async syncChannexFull(userId, domitsPropertyId, dateFrom, dateTo, options = {}) {
    const startedAt = nowMs();
    let stage = "service_entry";
    const stageLog = [];
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const dateContext = this.normalizeChannexFullSyncDateContext(dateFrom, dateTo);
    const { rawDateFrom, rawDateTo, usingDefaultDateRange, normalizedDateFrom, normalizedDateTo } = dateContext;
    const dryRun = parseBooleanQueryParam(options?.dryRun);
    const providerMode = normalizeChannexFullSyncProviderMode(options?.providerMode);
    const debugStage = normalizeChannexFullSyncDebugStage(options?.debugStage);
    const persistEvidence = parseBooleanQueryParam(options?.persistEvidence);
    const mark = (nextStage, fields = {}) => {
      stage = nextStage;
      const elapsedMs = nowMs() - startedAt;
      const entry = {
        stage: nextStage,
        at: nowMs(),
        elapsedMs,
        ...fields,
      };
      stageLog.push(entry);
      logChannexFullCertificationSync(nextStage, {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom ?? rawDateFrom,
        dateTo: normalizedDateTo ?? rawDateTo,
        dryRun,
        providerMode,
        debugStage,
        elapsedMs,
        ...fields,
      });
    };
    const finalize = async (result, evidencePatch = {}) => {
      const skipEvidence =
        options?.skipEvidence === true ||
        ((dryRun || debugStage) && debugStage !== "evidenceOnly" && !persistEvidence);
      mark("evidence_persist_start", { statusCode: result?.statusCode ?? null, skipEvidence });
      const finalized = await this.finalizeChannexSyncResult(
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
        {
          ...options,
          skipEvidence,
        }
      );
      mark("evidence_persisted", {
        evidencePersisted: finalized?.response?.evidencePersisted ?? null,
        evidenceId: finalized?.response?.evidenceId ?? null,
      });
      mark("response_returned", { statusCode: finalized?.statusCode ?? null });
      return finalized;
    };

    mark("service_entry");

    const invalidOptionResult = await this.finalizeInvalidChannexFullSyncOptions({
      providerMode,
      rawProviderMode: options?.providerMode,
      debugStage,
      rawDebugStage: options?.debugStage,
      dryRun,
      stageLog,
      finalize,
    });
    if (invalidOptionResult) return invalidOptionResult;

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
    const validationResult = await this.finalizeChannexFullSyncDateValidationFailure({
      validationFailure,
      dryRun,
      providerMode,
      debugStage,
      usingDefaultDateRange,
      stageLog,
      mark,
      finalize,
    });
    if (validationResult) return validationResult;

    try {
      mark("validation_passed", {
        selectedDays: countInclusiveIsoDateRangeDays(normalizedDateFrom, normalizedDateTo),
      });
      const earlyDebugResult = await this.finalizeChannexFullSyncEarlyDebugStage({
        debugStage,
        dryRun,
        providerMode,
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        stageLog,
        mark,
        finalize,
      });
      if (earlyDebugResult) return earlyDebugResult;

      const readinessContext = await this.loadChannexFullSyncReadinessContext({
        normalizedUserId,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        debugStage,
        stageLog,
        mark,
        finalize,
      });
      if (readinessContext.finalized) return readinessContext.finalized;

      const { readiness, mappingSnapshot, baseNotes } = readinessContext;

      const mappingsOnlyResult = await this.finalizeChannexFullSyncMappingsOnlyDebug({
        debugStage,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        finalize,
      });
      if (mappingsOnlyResult) return mappingsOnlyResult;

      const blockedReadinessResult = await this.finalizeBlockedChannexFullSyncReadiness({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        debugStage,
        mappingSnapshot,
        baseNotes,
        dateContext,
        stageLog,
        finalize,
      });
      if (blockedReadinessResult) return blockedReadinessResult;

      const payloadOnlyResult = await this.finalizeChannexFullSyncPayloadOnlyDebug({
        debugStage,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
      if (payloadOnlyResult) return payloadOnlyResult;

      mark("before_payload_generation");
      const payloadContext = await this.buildChannexFullSyncPayloadContext({
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
      });
      const availabilityPayloads = payloadContext.availabilityProviderPayloads;
      const restrictionPayloads = payloadContext.restrictionProviderPayloads;
      const payloadSummaries = {
        availability: payloadContext.availabilityPayloadSummary,
        restrictions: payloadContext.restrictionsPayloadSummary,
      };

      this.markChannexFullSyncPayloadContextBuilt({
        payloadContext,
        availabilityPayloads,
        restrictionPayloads,
        baseNotes,
        mark,
      });

      const providerPlan = this.buildChannexFullSyncProviderPlan({
        providerMode,
        availabilityPayloads,
        restrictionPayloads,
      });
      const preProviderResult = await this.finalizeChannexFullSyncPreProviderResult({
        providerPlan,
        payloadSummaries,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
      if (preProviderResult) return preProviderResult;

      mark("credentials_load_start");
      const credentialContext = await this.resolveChannexSyncCredentialContext({
        userId: normalizedUserId,
        mappingSnapshot,
        groupedPayloads: payloadSummaries,
        baseNotes,
        payloadPreview: {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          dryRun,
          providerMode,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          payloadSummaries,
          payloadsOmitted: true,
        },
      });
      const credentialFailureResult = await this.finalizeChannexFullSyncCredentialFailure({
        credentialContext,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        payloadSummaries,
        stageLog,
        mark,
        finalize,
      });
      if (credentialFailureResult) return credentialFailureResult;

      return await this.finalizeChannexFullSyncProviderSteps({
        providerPlan,
        credentialContext,
        readiness,
        normalizedDomitsPropertyId,
        normalizedDateFrom,
        normalizedDateTo,
        usingDefaultDateRange,
        dryRun,
        providerMode,
        payloadSummaries,
        mappingSnapshot,
        baseNotes,
        stageLog,
        mark,
        finalize,
      });
    } catch (error) {
      const errorDetails = buildChannexFullSyncErrorDetails(stage, error);
      logChannexFullCertificationSync("service_catch", {
        userId: normalizedUserId,
        domitsPropertyId: normalizedDomitsPropertyId,
        dateFrom: normalizedDateFrom ?? rawDateFrom,
        dateTo: normalizedDateTo ?? rawDateTo,
        dryRun,
        providerMode,
        ...errorDetails,
      });
      return await finalize(
        bad(500, {
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage,
          dryRun,
          providerMode,
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
          errorName: errorDetails.errorName,
          errorMessage: errorDetails.errorMessage,
          details: errorDetails.details,
          stackSummary: errorDetails.stackSummary,
          debug: {
            payloadsOmitted: true,
            stages: stageLog,
          },
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_FAILED",
              errorMessage: "Failed to run Channex certification full sync.",
              details: errorDetails.details,
              stage,
            },
          ],
          rawDetails: {
            caughtError: errorDetails,
            dryRun,
            providerMode,
            payloadsOmitted: true,
            stageLog,
          },
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
      selectedPhoneNumber: selectedNumber.phoneNumber || null,
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
