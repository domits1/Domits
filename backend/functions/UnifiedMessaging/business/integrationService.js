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

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";
import HoliduCredentialStore from "../.shared/channelManagement/providers/holidu/credentialStore.js";
import HoliduProviderClient from "../.shared/channelManagement/providers/holidu/providerClient.js";
import ChannexCredentialStore from "../.shared/channelManagement/providers/channex/credentialStore.js";
import ChannexProviderClient from "../.shared/channelManagement/providers/channex/providerClient.js";
import ChannelManagementService from "../.shared/channelManagement/channelManagementService.js";
import ChannexBookingPollingService from "../.shared/channelManagement/services/channexBookingPollingService.js";
import ChannexBookingRevisionImportService from "../.shared/channelManagement/services/channexBookingRevisionImportService.js";
import ChannexAvailabilitySyncService from "../.shared/channelManagement/services/channexAvailabilitySyncService.js";
import ChannexMappingService from "../.shared/channelManagement/services/channexMappingService.js";
import ChannexAriPayloadService from "../.shared/channelManagement/services/channexAriPayloadService.js";
import ChannexAriExecutionService from "../.shared/channelManagement/services/channexAriExecutionService.js";
import ChannexFullSyncService from "../.shared/channelManagement/services/channexFullSyncService.js";
import {
  buildCalendarDateRange,
  parseIsoDateParam,
} from "../.shared/channelManagement/utils/channexAriDateUtils.js";
import {
  CHANNEX_FULL_SYNC_DEFAULTS,
  summarizeChannexGroupedPayloads,
} from "../.shared/channelManagement/utils/channexAriPayloadUtils.js";
import { CHANNEL_CHANNEX } from "../.shared/channelManagement/utils/channexBookingPollUtils.js";
import {
  CHANNEX_BOOKING_CANCELLED_TRIGGER,
  toBookingAvailabilityBridgeBooking,
} from "../.shared/channelManagement/utils/channexBookingRevisionUtils.js";
import {
  buildChannexSyncEvidencePatch,
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  dedupeByJson,
  deriveEvidenceOutcome,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  getCombinedSyncStatus,
  getInvalidRequestOrFailedStatus,
  resultListHasErrors,
  resultListHasWarnings,
} from "../.shared/channelManagement/utils/channexAriExecutionUtils.js";
import ChannexBookingAvailabilityBridge, {
  ChannexBookingAvailabilityRepository,
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

const requireStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const compareAlphabetically = (left, right) => String(left).localeCompare(String(right));
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
const parseStructuredEvidenceField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return parseJsonSafely(value) ?? value;
};
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
const appendMissingMappingNotes = (notes, missingMappings) => {
  if (Array.isArray(missingMappings) && missingMappings.length) {
    return [...notes, `Missing mappings: ${missingMappings.join(", ")}`];
  }
  return notes;
};
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
    channexMappingService = null,
    channexAriPayloadService = null,
    channexAriExecutionService = null,
    channexFullSyncService = null,
    channexBookingRevisionImportService = null,
    channexAvailabilitySyncService = null,
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
    this.channexMappingService =
      channexMappingService ||
      new ChannexMappingService({
        accounts,
        props,
        ratePlans,
        roomTypes,
        channexCredentialStore,
        channexProviderClient,
      });
    this.channexAriPayloadService =
      channexAriPayloadService ||
      new ChannexAriPayloadService({
        channexMappingService: this.channexMappingService,
        bookingAvailabilityRepository,
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      });
    this.channexAriExecutionService =
      channexAriExecutionService ||
      new ChannexAriExecutionService({
        accounts,
        channexCredentialStore,
        channexProviderClient,
        finalizeChannexSyncResult: (result, evidenceInput, options) =>
          this.finalizeChannexSyncResult(result, evidenceInput, options),
        previewChannexAriPayloads: (...args) =>
          this.previewChannexAriPayloads(...args),
        previewChannexAvailabilityPayloads: (...args) =>
          this.previewChannexAvailabilityPayloads(...args),
        previewChannexRestrictionRatePayloads: (...args) =>
          this.previewChannexRestrictionRatePayloads(...args),
      });
    this.channexFullSyncService =
      channexFullSyncService ||
      new ChannexFullSyncService({
        channexProviderClient,
        normalizeChannexFullSyncDateContext: (...args) =>
          this.normalizeChannexFullSyncDateContext(...args),
        buildChannexFullSyncPayloadContext: (...args) =>
          this.buildChannexFullSyncPayloadContext(...args),
        buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
          this.buildChannexFullSyncAvailabilityPayloadContext(...args),
        buildChannexFullSyncRestrictionsPayloadContext: (...args) =>
          this.buildChannexFullSyncRestrictionsPayloadContext(...args),
        finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        buildChannexAriTargetsFailureEvidencePatch: (...args) =>
          this.buildChannexAriTargetsFailureEvidencePatch(...args),
        buildChannexMultiStepMappingSnapshot: (...args) =>
          this.buildChannexMultiStepMappingSnapshot(...args),
        buildBlockedChannexMultiStepSyncResult: (...args) =>
          this.buildBlockedChannexMultiStepSyncResult(...args),
        resolveChannexSyncCredentialContext: (...args) =>
          this.resolveChannexSyncCredentialContext(...args),
        logChannexFullCertificationSync,
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
    this.channexAvailabilitySyncService =
      channexAvailabilitySyncService ||
      new ChannexAvailabilitySyncService({
        channexBookingAvailabilityBridge,
        channexProviderClient,
        createChannexSyncFinalizer: (config) => this.createChannexSyncFinalizer(config),
        buildSyncDateRangeValidationFailure,
        appendMissingMappingNotes,
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        buildChannexAriTargetsFailureEvidencePatch: (...args) =>
          this.buildChannexAriTargetsFailureEvidencePatch(...args),
        buildChannexMultiStepMappingSnapshot: (...args) =>
          this.buildChannexMultiStepMappingSnapshot(...args),
        buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
          this.buildChannexFullSyncAvailabilityPayloadContext(...args),
        buildChannexFullSyncPayloadContext: (...args) =>
          this.buildChannexFullSyncPayloadContext(...args),
        resolveChannexSyncCredentialContext: (...args) =>
          this.resolveChannexSyncCredentialContext(...args),
        summarizeChannexGroupedPayloads,
        formatChannexAvailabilityProviderResult,
        formatChannexRestrictionProviderResult,
        collectTaskIdsFromResultList,
        collectWarningsFromResultList,
        collectErrorsFromResultList,
        resultListHasErrors,
        resultListHasWarnings,
        deriveEvidenceOutcome,
        describeLocalError,
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

  async resolveUsableChannexIntegration(...args) {
    return this.channexMappingService.resolveUsableChannexIntegration(...args);
  }

  async listChannexProperties(...args) {
    return this.channexMappingService.listChannexProperties(...args);
  }

  async listChannexRoomTypes(...args) {
    return this.channexMappingService.listChannexRoomTypes(...args);
  }

  async listChannexRatePlans(...args) {
    return this.channexMappingService.listChannexRatePlans(...args);
  }

  async linkChannexProperty(...args) {
    return this.channexMappingService.linkChannexProperty(...args);
  }

  async linkChannexRoomType(...args) {
    return this.channexMappingService.linkChannexRoomType(...args);
  }

  async linkChannexRatePlan(...args) {
    return this.channexMappingService.linkChannexRatePlan(...args);
  }

  async saveChannexSetupMapping(...args) {
    return this.channexMappingService.saveChannexSetupMapping(...args);
  }

  async listLinkedChannexRoomTypes(...args) {
    return this.channexMappingService.listLinkedChannexRoomTypes(...args);
  }

  async listLinkedChannexRatePlans(...args) {
    return this.channexMappingService.listLinkedChannexRatePlans(...args);
  }

  async getChannexAriTargets(...args) {
    return this.channexMappingService.getChannexAriTargets(...args);
  }

  async previewChannexAri(...args) {
    return this.channexAriPayloadService.previewChannexAri(...args);
  }

  async previewChannexAriPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAriPayloads(...args);
  }

  async previewChannexAvailabilityPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAvailabilityPayloads(...args);
  }

  async previewChannexRestrictionRatePayloads(...args) {
    return this.channexAriPayloadService.previewChannexRestrictionRatePayloads(...args);
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

  resolveChannexSyncCredentialContext(...args) {
    return this.channexAriExecutionService.resolveChannexSyncCredentialContext(...args);
  }

  createChannexSyncFinalizer(...args) {
    return this.channexAriExecutionService.createChannexSyncFinalizer(...args);
  }

  async syncChannexBookingAvailability(body = {}) {
    return this.channexAvailabilitySyncService.syncChannexBookingAvailability(body);
  }

  async syncChannexCalendarChange(body = {}, options = {}) {
    return this.channexAvailabilitySyncService.syncChannexCalendarChange(body, options);
  }

  async syncChannexAvailability(...args) {
    return this.channexAriExecutionService.syncChannexAvailability(...args);
  }

  async syncChannexRestrictions(...args) {
    return this.channexAriExecutionService.syncChannexRestrictions(...args);
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

  normalizeChannexFullSyncDateContext(...args) {
    return this.channexAriPayloadService.normalizeChannexFullSyncDateContext(...args);
  }

  async buildChannexFullSyncPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncPayloadContext(...args);
  }

  async buildChannexFullSyncAvailabilityPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncAvailabilityPayloadContext(...args);
  }

  async buildChannexFullSyncRestrictionsPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncRestrictionsPayloadContext(...args);
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

  async syncChannexFull(...args) {
    return this.channexFullSyncService.syncChannexFull(...args);
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
