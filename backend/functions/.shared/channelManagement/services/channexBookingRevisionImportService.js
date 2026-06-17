import {
  buildDeterministicChannexBookingId,
} from "../repositories/channexExternalBookingImportRepository.js";
import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import { hasChannexRequiredCredentialFields } from "../providers/channex/credentialUtils.js";
import {
  CHANNEL_CHANNEX,
  CHANNEX_BOOKING_POLL_SYNC_TYPE,
  CHANNEX_BOOKING_PULL_PROVIDER_ENDPOINT,
} from "../utils/channexBookingPollUtils.js";
import {
  CHANNEX_BOOKING_CANCELLED_TRIGGER,
  CHANNEX_BOOKING_CREATED_TRIGGER,
  CHANNEX_BOOKING_MODIFIED_TRIGGER,
  buildChannexPullIssue,
  toBookingAvailabilityBridgeBooking,
} from "../utils/channexBookingRevisionUtils.js";

const CHANNEX_BOOKING_REVISION_LIST_DEFAULT_LIMIT = 50;
const CHANNEX_BOOKING_REVISION_LIST_MAX_LIMIT = 100;
const CHANNEX_BOOKING_PULL_ACTION = "pull-latest-bookings";
const CHANNEX_BOOKING_PULL_SYNC_TYPE = "booking_pull";
const CHANNEX_BOOKING_IMPORT_SOURCE = "channex-booking-pull";
const CHANNEX_IMPORTED_BOOKING_STATUS = "Paid";
const CHANNEX_EXTERNAL_PAYMENT_STATUS = "EXTERNAL";
const CHANNEX_MODIFIED_UNLINKED_REASON =
  "modified revision not imported because no linked Domits booking was found";
const CHANNEX_CANCELLED_UNLINKED_REASON =
  "cancelled revision not imported because no linked Domits booking was found";
const CHANNEX_SENSITIVE_PAYLOAD_KEYS = new Set([
  "card_number",
  "credit_card",
  "cvv",
  "cvc",
  "guarantee",
  "card",
  "payment_card",
  "paymentcard",
  "payment_credential",
  "paymentcredential",
  "payment_credentials",
  "paymentcredentials",
  "card_holder",
  "cardholder",
  "card_holder_name",
  "cardholder_name",
  "cardholdername",
]);
const CHANNEX_PAYMENT_CONTEXT_KEYS = new Set([
  "payment",
  "payments",
  "card",
  "credit_card",
  "payment_card",
  "paymentcard",
  "payment_credential",
  "paymentcredential",
  "payment_credentials",
  "paymentcredentials",
  "guarantee",
]);

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
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
const parseStructuredEvidenceField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return parseJsonSafely(value) ?? value;
};
const serializeRawPayload = (rawPayload) => {
  if (!rawPayload) return null;
  return typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload);
};
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});
const withOptionalDetails = (target, details) => {
  if (details) {
    target.details = details;
  }
  return target;
};
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
const getBookingReceiveStatus = ({ fetched, persisted, failed }) => {
  if (fetched.length === 0) return "NOOP";
  if (failed.length === 0) return "SUCCESS";
  if (persisted.length) return "PARTIAL";
  return "FAILED";
};
const getBookingAcknowledgementStatus = ({ overallSuccess, acknowledged }) => {
  if (overallSuccess) return "SUCCESS";
  if (acknowledged.length) return "PARTIAL";
  return "FAILED";
};
const normalizePayloadKey = (key) => String(key || "").trim().toLowerCase();
const shouldRedactChannexPayloadKey = (key, path) => {
  const normalizedKey = normalizePayloadKey(key);
  if (CHANNEX_SENSITIVE_PAYLOAD_KEYS.has(normalizedKey)) return true;
  return normalizedKey === "token" && path.some((item) => CHANNEX_PAYMENT_CONTEXT_KEYS.has(normalizePayloadKey(item)));
};
const sanitizeChannexImportPayload = (value, path = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeChannexImportPayload(item, path));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      shouldRedactChannexPayloadKey(key, path)
        ? "[REDACTED]"
        : sanitizeChannexImportPayload(nestedValue, [...path, key]),
    ])
  );
};
const getChannexRevisionAttributes = (revision) => {
  const rawPayload = revision?.rawPayload;
  if (rawPayload?.attributes && typeof rawPayload.attributes === "object") return rawPayload.attributes;
  if (rawPayload?.data?.attributes && typeof rawPayload.data.attributes === "object") return rawPayload.data.attributes;
  return {};
};
const getChannexRevisionRoomLines = (revision) => {
  const attributes = getChannexRevisionAttributes(revision);
  if (Array.isArray(attributes.rooms)) return attributes.rooms;
  if (Array.isArray(revision?.rooms)) {
    return revision.rooms.map((room) => ({
      room_type_id: room?.roomTypeId ?? room?.room_type_id ?? null,
      rate_plan_id: room?.ratePlanId ?? room?.rate_plan_id ?? null,
    }));
  }
  if (requireStr(revision?.roomTypeId) || requireStr(revision?.ratePlanId)) {
    return [
      {
        room_type_id: revision?.roomTypeId ?? null,
        rate_plan_id: revision?.ratePlanId ?? null,
      },
    ];
  }
  return [];
};
const getChannexExternalReservationId = (revision) =>
  requireStr(revision?.bookingId) ||
  requireStr(revision?.uniqueId) ||
  requireStr(revision?.systemId) ||
  requireStr(revision?.revisionId);
const getChannexRevisionStatus = (revision) => String(revision?.status || "").trim().toLowerCase();
const isoDateToBookingMs = (value) => {
  const normalizedDate = parseIsoDateParam(value);
  if (!normalizedDate) return null;
  const parsed = new Date(`${normalizedDate}T00:00:00.000Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
const getDomitsBookingIdFromLink = (link) => {
  const payload = parseStructuredEvidenceField(link?.rawPayload);
  return requireStr(payload?.domits?.bookingId);
};
const buildChannexRoomLineMappingFailure = (roomLineCount) => {
  if (roomLineCount > 1) {
    return {
      errorCode: "CHANNEX_BOOKING_MULTI_ROOM_UNSUPPORTED",
      errorMessage: "Multi-room Channex booking revisions are not imported by this MVP.",
    };
  }

  return {
    errorCode: "CHANNEX_BOOKING_ROOM_MISSING",
    errorMessage: "Channex booking revision is missing a room line.",
  };
};
const buildImportedNewBookingResult = ({ ackOk, created }) => {
  if (!ackOk) return "imported-but-ack-failed";
  return created ? "created-and-acked" : "already-imported-and-acked";
};
const getChannexBookingPullEvidenceStatus = ({ overallSuccess, ackedCount }) => {
  if (overallSuccess) return "SUCCESS";
  return ackedCount > 0 ? "PARTIAL" : "FAILED";
};
const createSkippedChannexPullItem = ({ revision, externalReservationId, reasonCode, reasonMessage, warnings = [] }) => ({
  revisionId: requireStr(revision?.revisionId),
  bookingId: requireStr(revision?.bookingId),
  externalReservationId: externalReservationId ?? getChannexExternalReservationId(revision),
  status: requireStr(revision?.status),
  domitsBookingId: null,
  linkId: null,
  result: "skipped-unacked",
  rawPersisted: false,
  createdBooking: false,
  updatedBooking: false,
  cancelledBooking: false,
  acked: false,
  unacked: true,
  warnings: [buildChannexPullIssue(reasonCode, reasonMessage), ...warnings],
  errors: [],
});
const buildChannexBookingLinkPayload = ({ revision, externalReservationId, domitsBookingId, action }) => ({
  channex: {
    revisionId: requireStr(revision?.revisionId),
    bookingId: requireStr(revision?.bookingId),
    uniqueId: requireStr(revision?.uniqueId),
    systemId: requireStr(revision?.systemId),
    otaReservationCode: requireStr(revision?.otaReservationCode),
    otaName: requireStr(revision?.otaName),
    status: requireStr(revision?.status),
    propertyId: requireStr(revision?.propertyId),
    roomTypeId: requireStr(revision?.roomTypeId),
    ratePlanId: requireStr(revision?.ratePlanId),
    arrivalDate: parseIsoDateParam(revision?.arrivalDate) ?? null,
    departureDate: parseIsoDateParam(revision?.departureDate) ?? null,
    guestName: requireStr(revision?.guestName),
    amount: revision?.amount ?? null,
    currency: requireStr(revision?.currency),
    insertedAt: requireStr(revision?.insertedAt),
    sanitizedSourcePayload: sanitizeChannexImportPayload(revision?.rawPayload ?? revision ?? null),
  },
  domits: {
    bookingId: domitsBookingId,
  },
  externalReservationId,
  importedBy: CHANNEX_BOOKING_IMPORT_SOURCE,
  action,
});
const withChannexAvailabilitySync = (itemPatch, channexAvailabilitySync) =>
  channexAvailabilitySync === undefined ? itemPatch : { ...itemPatch, channexAvailabilitySync };
const buildChannexBookingRevisionPersistencePayload = ({ revision, propertyMapping }) => ({
  provider: "CHANNEX",
  channel: CHANNEL_CHANNEX,
  externalPropertyId: requireStr(propertyMapping?.externalPropertyId) ?? null,
  revisionId: requireStr(revision?.revisionId) ?? null,
  bookingId: requireStr(revision?.bookingId) ?? null,
  uniqueId: requireStr(revision?.uniqueId) ?? null,
  systemId: requireStr(revision?.systemId) ?? null,
  status: requireStr(revision?.status) ?? null,
  arrivalDate: parseIsoDateParam(revision?.arrivalDate) ?? null,
  departureDate: parseIsoDateParam(revision?.departureDate) ?? null,
  propertyId: requireStr(revision?.propertyId) ?? null,
  roomTypeId: requireStr(revision?.roomTypeId) ?? null,
  ratePlanId: requireStr(revision?.ratePlanId) ?? null,
  guestName: requireStr(revision?.guestName) ?? null,
  persistedAt: nowMs(),
  payload: sanitizeChannexImportPayload(revision?.rawPayload ?? revision ?? null),
});
const summarizeChannexPullItems = (items) => ({
  rawPersistedCount: items.filter((item) => item.rawPersisted).length,
  createdBookingCount: items.filter((item) => item.createdBooking).length,
  updatedBookingCount: items.filter((item) => item.updatedBooking).length,
  cancelledBookingCount: items.filter((item) => item.cancelledBooking).length,
  skippedCount: items.filter((item) => item.result === "skipped-unacked").length,
  ackedCount: items.filter((item) => item.acked).length,
  unackedCount: items.filter((item) => item.unacked).length,
  warnings: items.flatMap((item) => (Array.isArray(item.warnings) ? item.warnings : [])),
  errors: items.flatMap((item) => (Array.isArray(item.errors) ? item.errors : [])),
});
const normalizePositiveLimit = (limit, defaultLimit, maxLimit) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit)) return defaultLimit;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), maxLimit);
};

export default class ChannexBookingRevisionImportService {
  constructor({
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
    finalizeChannexSyncResult,
  }) {
    this.accounts = accounts;
    this.props = props;
    this.ratePlans = ratePlans;
    this.roomTypes = roomTypes;
    this.resLinks = resLinks;
    this.channexBookingRevisions = channexBookingRevisions;
    this.externalBookingImportRepository = externalBookingImportRepository;
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
    this.finalizeChannexSyncResult = finalizeChannexSyncResult;
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
      rawPayload: serializeRawPayload(buildChannexBookingRevisionPersistencePayload({ revision, propertyMapping })),
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

  buildChannexBookingImportBaseItem({ revision, externalReservationId, persisted }) {
    return {
      revisionId: requireStr(revision?.revisionId),
      bookingId: requireStr(revision?.bookingId),
      externalReservationId,
      status: requireStr(revision?.status),
      domitsBookingId: null,
      linkId: null,
      result: null,
      rawPersisted: !!persisted,
      createdBooking: false,
      updatedBooking: false,
      cancelledBooking: false,
      acked: false,
      unacked: false,
      warnings: [],
      errors: [],
    };
  }

  buildChannexBookingImportDates(revision) {
    const arrivalDate = parseIsoDateParam(revision?.arrivalDate);
    const departureDate = parseIsoDateParam(revision?.departureDate);
    const arrivalDateMs = isoDateToBookingMs(arrivalDate);
    const departureDateMs = isoDateToBookingMs(departureDate);

    if (!arrivalDate || !departureDate || !Number.isFinite(arrivalDateMs) || !Number.isFinite(departureDateMs)) {
      return {
        ok: false,
        errorCode: "CHANNEX_BOOKING_DATES_INVALID",
        errorMessage: "Channex booking revision is missing valid arrival/departure dates.",
      };
    }

    if (departureDateMs <= arrivalDateMs) {
      return {
        ok: false,
        errorCode: "CHANNEX_BOOKING_DATES_INVALID",
        errorMessage: "Channex booking departure date must be after arrival date.",
      };
    }

    return {
      ok: true,
      arrivalDate,
      departureDate,
      arrivalDateMs,
      departureDateMs,
    };
  }

  findActiveChannexRoomTypeMapping({ roomTypeMappings, domitsPropertyId, externalPropertyId, externalRoomTypeId }) {
    return (Array.isArray(roomTypeMappings) ? roomTypeMappings : []).find(
      (mapping) =>
        requireStr(mapping?.domitsPropertyId) === domitsPropertyId &&
        requireStr(mapping?.externalPropertyId) === externalPropertyId &&
        requireStr(mapping?.externalRoomTypeId) === externalRoomTypeId &&
        String(mapping?.status || "").toUpperCase() === "ACTIVE"
    );
  }

  findActiveChannexRatePlanMapping({
    ratePlanMappings,
    domitsPropertyId,
    externalPropertyId,
    externalRoomTypeId,
    externalRatePlanId,
  }) {
    return (Array.isArray(ratePlanMappings) ? ratePlanMappings : []).find(
      (mapping) =>
        requireStr(mapping?.domitsPropertyId) === domitsPropertyId &&
        requireStr(mapping?.externalPropertyId) === externalPropertyId &&
        requireStr(mapping?.externalRoomTypeId) === externalRoomTypeId &&
        requireStr(mapping?.externalRatePlanId) === externalRatePlanId &&
        String(mapping?.status || "").toUpperCase() === "ACTIVE"
    );
  }

  resolveChannexBookingImportMapping({
    revision,
    normalizedDomitsPropertyId,
    propertyMapping,
    roomTypeMappings,
    ratePlanMappings,
  }) {
    if (!this.isChannexBookingRevisionInPropertyScope(revision, propertyMapping)) {
      return {
        ok: false,
        errorCode: "CHANNEX_BOOKING_PROPERTY_SCOPE_MISMATCH",
        errorMessage: "Fetched booking revision does not belong to the selected Channex property mapping.",
      };
    }

    const roomLines = getChannexRevisionRoomLines(revision);
    if (roomLines.length !== 1) {
      const failure = buildChannexRoomLineMappingFailure(roomLines.length);
      return {
        ok: false,
        ...failure,
      };
    }

    const externalPropertyId = requireStr(propertyMapping?.externalPropertyId);
    const externalRoomTypeId = requireStr(roomLines[0]?.room_type_id) || requireStr(revision?.roomTypeId);
    const externalRatePlanId = requireStr(roomLines[0]?.rate_plan_id) || requireStr(revision?.ratePlanId);
    const roomTypeMapping = this.findActiveChannexRoomTypeMapping({
      roomTypeMappings,
      domitsPropertyId: normalizedDomitsPropertyId,
      externalPropertyId,
      externalRoomTypeId,
    });

    if (!roomTypeMapping) {
      return {
        ok: false,
        errorCode: "CHANNEX_ROOM_TYPE_MAPPING_MISSING",
        errorMessage: "Channex room type mapping is missing for this booking revision.",
      };
    }

    if (!externalRatePlanId) {
      return {
        ok: true,
        externalPropertyId,
        externalRoomTypeId,
        externalRatePlanId: null,
        roomTypeMapping,
        ratePlanMapping: null,
      };
    }

    const ratePlanMapping = this.findActiveChannexRatePlanMapping({
      ratePlanMappings,
      domitsPropertyId: normalizedDomitsPropertyId,
      externalPropertyId,
      externalRoomTypeId,
      externalRatePlanId,
    });

    if (!ratePlanMapping) {
      return {
        ok: false,
        errorCode: "CHANNEX_RATE_PLAN_MAPPING_MISSING",
        errorMessage: "Channex rate plan mapping is missing for this booking revision.",
      };
    }

    return {
      ok: true,
      externalPropertyId,
      externalRoomTypeId,
      externalRatePlanId,
      roomTypeMapping,
      ratePlanMapping,
    };
  }

  async acknowledgeImportedChannexBookingRevision({
    revisionId,
    secret,
    integration,
    normalizedDomitsPropertyId,
    propertyMapping,
  }) {
    const acknowledgement = await this.processChannexBookingAcknowledgement({
      revisionId,
      secret,
      integration,
      normalizedDomitsPropertyId,
      propertyMapping,
    });

    if (acknowledgement.failure) {
      return {
        ok: false,
        error: buildChannexPullIssue(
          acknowledgement.failure.errorCode || "CHANNEX_BOOKING_ACK_FAILED",
          acknowledgement.failure.errorMessage || "Failed to acknowledge Channex booking revision.",
          { stage: acknowledgement.failure.stage ?? "ack" }
        ),
      };
    }

    return {
      ok: true,
      acknowledgement: acknowledgement.acknowledged,
    };
  }

  async upsertChannexImportedReservationLink({
    integration,
    externalReservationId,
    revision,
    dates,
    mapping,
    domitsBookingId,
    action,
    reservationStatus,
  }) {
    const linkData = {
      integrationAccountId: integration.id,
      channel: CHANNEL_CHANNEX,
      externalReservationId,
      externalThreadId: requireStr(revision?.otaReservationCode) || requireStr(revision?.uniqueId),
      domitsThreadId: null,
      domitsPropertyId: mapping.roomTypeMapping.domitsPropertyId,
      guestName: requireStr(revision?.guestName) || "Channex guest",
      checkInAt: dates.arrivalDateMs,
      checkOutAt: dates.departureDateMs,
      reservationStatus,
      ratePlan:
        requireStr(mapping.ratePlanMapping?.externalRatePlanName) ||
        requireStr(mapping.ratePlanMapping?.externalRatePlanId) ||
        requireStr(mapping.externalRatePlanId),
      paymentStatus: CHANNEX_EXTERNAL_PAYMENT_STATUS,
      rawPayload: serializeRawPayload(
        buildChannexBookingLinkPayload({
          revision,
          externalReservationId,
          domitsBookingId,
          action,
        })
      ),
    };

    try {
      return await this.resLinks.upsert(linkData);
    } catch (error) {
      const existingLink = await this.resLinks.getByIntegrationAccountIdAndExternalReservation({
        integrationAccountId: integration.id,
        channel: CHANNEL_CHANNEX,
        externalReservationId,
      });

      if (existingLink?.id && getDomitsBookingIdFromLink(existingLink) === domitsBookingId) {
        return existingLink;
      }

      const confirmationError = new Error(
        "ChannelReservationLink could not be confirmed after an upsert failure; Channex revision will remain unacked."
      );
      confirmationError.code = "CHANNEX_RESERVATION_LINK_CONFIRM_FAILED";
      confirmationError.cause = error;
      throw confirmationError;
    }
  }

  async createOrReuseChannexImportedBooking({ revision, integration, externalReservationId, propertyContext, dates }) {
    const deterministicBookingId = buildDeterministicChannexBookingId(integration.id, externalReservationId);
    const existingBooking = await this.externalBookingImportRepository.getBookingById(deterministicBookingId);
    if (existingBooking) {
      return {
        booking: existingBooking,
        created: false,
        domitsBookingId: deterministicBookingId,
      };
    }

    let createdBooking = null;
    try {
      createdBooking = await this.externalBookingImportRepository.createExternalBooking({
        bookingId: deterministicBookingId,
        propertyId: propertyContext.propertyId,
        hostId: propertyContext.hostId,
        externalReservationId,
        guestName: requireStr(revision?.guestName) || "Channex guest",
        arrivalDateMs: dates.arrivalDateMs,
        departureDateMs: dates.departureDateMs,
      });
    } catch (error) {
      const recoveredBooking = await this.externalBookingImportRepository.getBookingById(deterministicBookingId);
      if (recoveredBooking) {
        return {
          booking: recoveredBooking,
          created: false,
          domitsBookingId: deterministicBookingId,
        };
      }
      throw error;
    }

    return {
      booking: createdBooking,
      created: true,
      domitsBookingId: deterministicBookingId,
    };
  }

  async syncChannexImportedBookingAvailability({ bookingBefore = null, bookingAfter = null, trigger }) {
    const referenceBooking = bookingAfter || bookingBefore || {};
    return await this.channexBookingAvailabilityBridge.syncAvailabilityForBookingChange({
      userId: referenceBooking.hostId,
      bookingBefore: toBookingAvailabilityBridgeBooking(bookingBefore),
      bookingAfter: toBookingAvailabilityBridgeBooking(bookingAfter),
      trigger,
    });
  }

  async finalizeChannexBookingImportItem({
    baseItem,
    revision,
    integration,
    externalReservationId,
    dates,
    mapping,
    domitsBookingId,
    action,
    reservationStatus,
    secret,
    normalizedDomitsPropertyId,
    propertyMapping,
    resultForAck,
    itemPatch = {},
  }) {
    const link = await this.upsertChannexImportedReservationLink({
      integration,
      externalReservationId,
      revision,
      dates,
      mapping,
      domitsBookingId,
      action,
      reservationStatus,
    });
    const ack = await this.acknowledgeImportedChannexBookingRevision({
      revisionId: revision.revisionId,
      secret,
      integration,
      normalizedDomitsPropertyId,
      propertyMapping,
    });

    return {
      ...baseItem,
      domitsBookingId,
      linkId: link?.id ?? null,
      result: resultForAck(ack.ok),
      ...itemPatch,
      acked: ack.ok,
      unacked: !ack.ok,
      errors: ack.ok ? [] : [ack.error],
    };
  }

  async processNewChannexBookingRevision({
    baseItem,
    revision,
    integration,
    externalReservationId,
    existingLink,
    propertyContext,
    dates,
    mapping,
    secret,
    normalizedDomitsPropertyId,
    propertyMapping,
  }) {
    const linkedBookingId = getDomitsBookingIdFromLink(existingLink);
    const linkedBooking = linkedBookingId
      ? await this.externalBookingImportRepository.getBookingById(linkedBookingId)
      : null;
    const bookingResult = linkedBooking
      ? { booking: linkedBooking, created: false, domitsBookingId: linkedBookingId }
      : await this.createOrReuseChannexImportedBooking({
          revision,
          integration,
          externalReservationId,
          propertyContext,
          dates,
        });

    if (!bookingResult.booking) {
      return {
        ...baseItem,
        result: "booking-create-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            "DOMITS_BOOKING_CREATE_FAILED",
            "Domits booking could not be created for this Channex booking revision."
          ),
        ],
      };
    }

    const channexAvailabilitySync = bookingResult.created
      ? await this.syncChannexImportedBookingAvailability({
          bookingAfter: bookingResult.booking,
          trigger: CHANNEX_BOOKING_CREATED_TRIGGER,
        })
      : undefined;

    return await this.finalizeChannexBookingImportItem({
      baseItem,
      integration,
      externalReservationId,
      revision,
      dates,
      mapping,
      domitsBookingId: bookingResult.domitsBookingId,
      action: bookingResult.created ? "created" : "already-imported",
      reservationStatus: CHANNEX_IMPORTED_BOOKING_STATUS,
      secret,
      normalizedDomitsPropertyId,
      propertyMapping,
      resultForAck: (ackOk) => buildImportedNewBookingResult({ ackOk, created: bookingResult.created }),
      itemPatch: withChannexAvailabilitySync({ createdBooking: bookingResult.created }, channexAvailabilitySync),
    });
  }

  async processModifiedChannexBookingRevision({
    baseItem,
    revision,
    existingLink,
    dates,
    mapping,
    integration,
    externalReservationId,
    secret,
    normalizedDomitsPropertyId,
    propertyMapping,
  }) {
    const domitsBookingId = getDomitsBookingIdFromLink(existingLink);
    if (!domitsBookingId) {
      return {
        ...baseItem,
        result: "skipped-unacked",
        unacked: true,
        warnings: [
          buildChannexPullIssue("CHANNEX_MODIFIED_BOOKING_LINK_MISSING", CHANNEX_MODIFIED_UNLINKED_REASON),
        ],
      };
    }

    const bookingBefore = await this.externalBookingImportRepository.getBookingById(domitsBookingId);
    if (!bookingBefore) {
      return {
        ...baseItem,
        domitsBookingId,
        result: "booking-update-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            "DOMITS_BOOKING_UPDATE_FAILED",
            "Linked Domits booking could not be updated for this Channex modified revision."
          ),
        ],
      };
    }

    const updatedBooking = await this.externalBookingImportRepository.updateImportedBooking({
      bookingId: domitsBookingId,
      guestName: requireStr(revision?.guestName) || "Channex guest",
      arrivalDateMs: dates.arrivalDateMs,
      departureDateMs: dates.departureDateMs,
    });
    if (!updatedBooking) {
      return {
        ...baseItem,
        domitsBookingId,
        result: "booking-update-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            "DOMITS_BOOKING_UPDATE_FAILED",
            "Linked Domits booking could not be updated for this Channex modified revision."
          ),
        ],
      };
    }

    const channexAvailabilitySync = await this.syncChannexImportedBookingAvailability({
      bookingBefore,
      bookingAfter: updatedBooking,
      trigger: CHANNEX_BOOKING_MODIFIED_TRIGGER,
    });

    return await this.finalizeChannexBookingImportItem({
      baseItem,
      integration,
      externalReservationId,
      revision,
      dates,
      mapping,
      domitsBookingId,
      action: "modified",
      reservationStatus: CHANNEX_IMPORTED_BOOKING_STATUS,
      secret,
      normalizedDomitsPropertyId,
      propertyMapping,
      resultForAck: (ackOk) => (ackOk ? "updated-and-acked" : "updated-but-ack-failed"),
      itemPatch: withChannexAvailabilitySync({ updatedBooking: true }, channexAvailabilitySync),
    });
  }

  async processCancelledChannexBookingRevision({
    baseItem,
    revision,
    existingLink,
    dates,
    mapping,
    integration,
    externalReservationId,
    secret,
    normalizedDomitsPropertyId,
    propertyMapping,
  }) {
    const domitsBookingId = getDomitsBookingIdFromLink(existingLink);
    if (!domitsBookingId) {
      return {
        ...baseItem,
        result: "skipped-unacked",
        unacked: true,
        warnings: [
          buildChannexPullIssue("CHANNEX_CANCELLED_BOOKING_LINK_MISSING", CHANNEX_CANCELLED_UNLINKED_REASON),
        ],
      };
    }

    const bookingBefore = await this.externalBookingImportRepository.getBookingById(domitsBookingId);
    if (!bookingBefore) {
      return {
        ...baseItem,
        domitsBookingId,
        result: "booking-cancel-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            "DOMITS_BOOKING_CANCEL_FAILED",
            "Linked Domits booking could not be cancelled for this Channex cancelled revision."
          ),
        ],
      };
    }

    const cancelledBooking = await this.externalBookingImportRepository.cancelImportedBooking(domitsBookingId);
    if (!cancelledBooking) {
      return {
        ...baseItem,
        domitsBookingId,
        result: "booking-cancel-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            "DOMITS_BOOKING_CANCEL_FAILED",
            "Linked Domits booking could not be cancelled for this Channex cancelled revision."
          ),
        ],
      };
    }

    const channexAvailabilitySync = await this.syncChannexImportedBookingAvailability({
      bookingBefore,
      bookingAfter: cancelledBooking,
      trigger: CHANNEX_BOOKING_CANCELLED_TRIGGER,
    });

    return await this.finalizeChannexBookingImportItem({
      baseItem,
      integration,
      externalReservationId,
      revision,
      dates,
      mapping,
      domitsBookingId,
      action: "cancelled",
      reservationStatus: "Cancelled",
      secret,
      normalizedDomitsPropertyId,
      propertyMapping,
      resultForAck: (ackOk) => (ackOk ? "cancelled-and-acked" : "cancelled-but-ack-failed"),
      itemPatch: withChannexAvailabilitySync({ cancelledBooking: true }, channexAvailabilitySync),
    });
  }

  async processPulledChannexBookingRevision({
    revision,
    integration,
    normalizedDomitsPropertyId,
    propertyMapping,
    propertyContext,
    roomTypeMappings,
    ratePlanMappings,
    secret,
  }) {
    const externalReservationId = getChannexExternalReservationId(revision);
    let persisted = null;

    try {
      persisted = await this.persistChannexBookingRevision({
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        propertyMapping,
        revision,
      });
    } catch (error) {
      return {
        ...createSkippedChannexPullItem({
          revision,
          externalReservationId,
          reasonCode: error?.code || "CHANNEX_BOOKING_PERSIST_FAILED",
          reasonMessage: error?.message || "Failed to persist Channex booking revision.",
        }),
        errors: [
          buildChannexPullIssue(
            error?.code || "CHANNEX_BOOKING_PERSIST_FAILED",
            error?.message || "Failed to persist Channex booking revision."
          ),
        ],
      };
    }

    const baseItem = this.buildChannexBookingImportBaseItem({ revision, externalReservationId, persisted });
    try {
      if (!externalReservationId) {
        return {
          ...baseItem,
          result: "skipped-unacked",
          unacked: true,
          warnings: [
            buildChannexPullIssue(
              "CHANNEX_BOOKING_RESERVATION_ID_MISSING",
              "Channex booking revision is missing a stable reservation identifier."
            ),
          ],
        };
      }

      const mapping = this.resolveChannexBookingImportMapping({
        revision,
        normalizedDomitsPropertyId,
        propertyMapping,
        roomTypeMappings,
        ratePlanMappings,
      });
      if (!mapping.ok) {
        return {
          ...baseItem,
          result: "skipped-unacked",
          unacked: true,
          warnings: [buildChannexPullIssue(mapping.errorCode, mapping.errorMessage)],
        };
      }

      if (!propertyContext?.hostId || !propertyContext?.propertyId) {
        return {
          ...baseItem,
          result: "skipped-unacked",
          unacked: true,
          warnings: [
            buildChannexPullIssue(
              "DOMITS_PROPERTY_CONTEXT_MISSING",
              "Domits property host context could not be resolved for this booking import."
            ),
          ],
        };
      }

      const dates = this.buildChannexBookingImportDates(revision);
      if (!dates.ok) {
        return {
          ...baseItem,
          result: "skipped-unacked",
          unacked: true,
          warnings: [buildChannexPullIssue(dates.errorCode, dates.errorMessage)],
        };
      }

      const existingLink = await this.resLinks.getByIntegrationAccountIdAndExternalReservation({
        integrationAccountId: integration.id,
        channel: CHANNEL_CHANNEX,
        externalReservationId,
      });
      const status = getChannexRevisionStatus(revision);
      if (status === "new") {
        return await this.processNewChannexBookingRevision({
          baseItem,
          revision,
          integration,
          externalReservationId,
          existingLink,
          propertyContext,
          dates,
          mapping,
          secret,
          normalizedDomitsPropertyId,
          propertyMapping,
        });
      }

      if (status === "modified") {
        return await this.processModifiedChannexBookingRevision({
          baseItem,
          revision,
          existingLink,
          dates,
          mapping,
          integration,
          externalReservationId,
          secret,
          normalizedDomitsPropertyId,
          propertyMapping,
        });
      }

      if (status === "cancelled" || status === "canceled") {
        return await this.processCancelledChannexBookingRevision({
          baseItem,
          revision,
          existingLink,
          dates,
          mapping,
          integration,
          externalReservationId,
          secret,
          normalizedDomitsPropertyId,
          propertyMapping,
        });
      }

      return {
        ...baseItem,
        result: "skipped-unacked",
        unacked: true,
        warnings: [
          buildChannexPullIssue(
            "CHANNEX_BOOKING_REVISION_STATUS_UNSUPPORTED",
            "Only new, modified, and cancelled Channex booking revisions are handled by this pull flow."
          ),
        ],
      };
    } catch (error) {
      return {
        ...baseItem,
        result: "import-failed-unacked",
        unacked: true,
        errors: [
          buildChannexPullIssue(
            error?.code || error?.name || "CHANNEX_BOOKING_IMPORT_FAILED",
            error?.message || "Failed to import Channex booking revision into Domits."
          ),
        ],
      };
    }
  }

  async collectPulledChannexBookingImports({
    providerResult,
    integration,
    normalizedDomitsPropertyId,
    propertyMapping,
    secret,
  }) {
    const [roomTypeMappings, ratePlanMappings, propertyContext] = await Promise.all([
      this.roomTypes.listByAccountId(integration.id),
      this.ratePlans.listByAccountId(integration.id),
      this.externalBookingImportRepository.getDomitsPropertyContext(normalizedDomitsPropertyId),
    ]);
    const items = [];

    for (const revision of Array.isArray(providerResult.revisions) ? providerResult.revisions : []) {
      items.push(
        await this.processPulledChannexBookingRevision({
          revision,
          integration,
          normalizedDomitsPropertyId,
          propertyMapping,
          propertyContext,
          roomTypeMappings,
          ratePlanMappings,
          secret,
        })
      );
    }

    return items;
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

  async processChannexBookingAcknowledgement({ revisionId, secret, integration, normalizedDomitsPropertyId, propertyMapping }) {
    const existing = await this.channexBookingRevisions.getByIntegrationAccountIdAndRevisionId(
      integration.id,
      revisionId
    );
    if (!existing) {
      return {
        persisted: null,
        acknowledged: null,
        failure: {
          revisionId,
          stage: "local_lookup",
          errorCode: "CHANNEX_BOOKING_REVISION_NOT_RECEIVED_BY_FEED",
          errorMessage: "Booking revision must be received through the feed endpoint before acknowledgement.",
        },
      };
    }

    if (
      requireStr(existing.domitsPropertyId) !== normalizedDomitsPropertyId ||
      requireStr(existing.externalPropertyId) !== requireStr(propertyMapping?.externalPropertyId)
    ) {
      return {
        persisted: this.formatPersistedChannexBookingRevision(existing),
        acknowledged: null,
        failure: this.buildChannexBookingScopeFailure(
          {
            revisionId,
            externalPropertyId: existing.externalPropertyId ?? null,
          },
          revisionId
        ),
      };
    }

    const latestPersisted = this.formatPersistedChannexBookingRevision(existing);
    if (latestPersisted?.acknowledgementState === "ACKNOWLEDGED") {
      return {
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

  async pullLatestChannexBookingsForResolvedContext({
    normalizedUserId,
    normalizedDomitsPropertyId,
    integration,
    propertyMapping,
    secret,
    startedAt = nowMs(),
    syncType = CHANNEX_BOOKING_PULL_SYNC_TYPE,
    action = CHANNEX_BOOKING_PULL_ACTION,
    trigger = "MANUAL_PULL",
    options = {},
  }) {
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType,
          dateFrom: null,
          dateTo: null,
          startedAt,
          evidencePatch,
        }),
        options
      );

    const isPoll = syncType === CHANNEX_BOOKING_POLL_SYNC_TYPE;
    const notes = isPoll
      ? [
          "Automatic Channex booking poll. New revisions create Domits booking records before acknowledgement.",
          "Modified/cancelled revisions are acknowledged only when a prior imported Domits booking link is available.",
        ]
      : [
          "Manual Channex booking pull. New revisions create Domits booking records before acknowledgement.",
          "Modified/cancelled revisions are acknowledged only when a prior imported Domits booking link is available.",
        ];
    const mappingSnapshot = this.buildChannexBookingMappingSnapshot(propertyMapping);
    const providerResult = await this.channexProviderClient.listBookingRevisionFeed(secret, {
      externalPropertyId: propertyMapping.externalPropertyId,
    });
    if (!providerResult?.success) {
      const failure = this.buildChannexBookingProviderFeedFailure({
        integration,
        providerResult,
        mappingSnapshot,
        notes: [notes[0]],
      });
      return await finalize(failure.response, failure.evidencePatch);
    }

    const items = await this.collectPulledChannexBookingImports({
      providerResult,
      integration,
      normalizedDomitsPropertyId,
      propertyMapping,
      secret,
    });
    const summary = summarizeChannexPullItems(items);
    const fetchedCount = Array.isArray(providerResult.revisions) ? providerResult.revisions.length : 0;
    const overallSuccess = summary.unackedCount === 0 && summary.errors.length === 0;
    const status = getChannexBookingPullEvidenceStatus({
      overallSuccess,
      ackedCount: summary.ackedCount,
    });
    const response = ok({
      channel: CHANNEL_CHANNEX,
      action,
      endpointCalled: CHANNEX_BOOKING_PULL_PROVIDER_ENDPOINT,
      integrationAccountId: integration.id,
      domitsPropertyId: normalizedDomitsPropertyId,
      externalPropertyId: propertyMapping.externalPropertyId,
      calledProvider: true,
      fetchedCount,
      rawPersistedCount: summary.rawPersistedCount,
      createdBookingCount: summary.createdBookingCount,
      updatedBookingCount: summary.updatedBookingCount,
      cancelledBookingCount: summary.cancelledBookingCount,
      skippedCount: summary.skippedCount,
      ackedCount: summary.ackedCount,
      unackedCount: summary.unackedCount,
      items,
      warnings: summary.warnings,
      errors: summary.errors,
      overallSuccess,
      notes,
      ...(isPoll ? { trigger } : {}),
    });

    return await finalize(response, {
      integrationAccountId: integration.id,
      status,
      overallSuccess,
      mappingSnapshot,
      providerResponseSummary: {
        calledProvider: true,
        providerStatus: providerResult?.providerStatus ?? null,
        fetchedCount,
        rawPersistedCount: summary.rawPersistedCount,
        createdBookingCount: summary.createdBookingCount,
        updatedBookingCount: summary.updatedBookingCount,
        cancelledBookingCount: summary.cancelledBookingCount,
        skippedCount: summary.skippedCount,
        ackedCount: summary.ackedCount,
        unackedCount: summary.unackedCount,
      },
      warnings: summary.warnings,
      errors: summary.errors,
      notes: response.response.notes,
      rawDetails: {
        trigger,
        items,
        providerStatus: providerResult?.providerStatus ?? null,
        propertyMapping: mappingSnapshot.propertyMapping,
      },
    });
  }

  async pullLatestChannexBookings(userId, domitsPropertyId, options = {}) {
    const startedAt = nowMs();
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);
    const finalize = async (result, evidencePatch = {}) =>
      this.finalizeChannexSyncResult(
        result,
        buildChannexSyncEvidencePatch({
          normalizedUserId,
          normalizedDomitsPropertyId,
          syncType: CHANNEX_BOOKING_PULL_SYNC_TYPE,
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
            "Manual Channex booking pull imports new external bookings into Domits before acknowledgement.",
            "No acknowledgement is attempted when mapping or Domits booking persistence fails.",
          ],
        });
      }

      const { integration, propertyMapping, secret } = context;
      return await this.pullLatestChannexBookingsForResolvedContext({
        normalizedUserId,
        normalizedDomitsPropertyId,
        integration,
        propertyMapping,
        secret,
        startedAt,
        syncType: CHANNEX_BOOKING_PULL_SYNC_TYPE,
        action: CHANNEX_BOOKING_PULL_ACTION,
        trigger: "MANUAL_PULL",
        options,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return await finalize(
        bad(500, {
          error: "Failed to pull Channex bookings.",
          errorCode: "CHANNEX_BOOKING_PULL_FAILED",
          details,
        }),
        {
          status: "FAILED",
          overallSuccess: false,
          errors: [
            {
              errorCode: "CHANNEX_BOOKING_PULL_FAILED",
              errorMessage: "Failed to pull Channex bookings.",
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
            "Manual staging booking acknowledgement only. This endpoint acknowledges booking revisions already received and persisted from the Channex feed.",
            "Acknowledgement is never attempted for revisions that were not received by feed or fall outside the currently selected property mapping.",
          ],
        });
      }

      const { integration, propertyMapping, secret } = context;
      const mappingSnapshot = this.buildChannexBookingMappingSnapshot(propertyMapping);
      const notes = [
        "Manual staging booking acknowledgement only. This endpoint uses persisted booking revisions received from the Channex feed and does not fetch the same revision by ID.",
        "Acknowledgement is never attempted for revisions that were not received by feed or fall outside the currently selected property mapping.",
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

}
