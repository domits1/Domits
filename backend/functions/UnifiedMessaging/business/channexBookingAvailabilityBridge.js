import { randomUUID } from "node:crypto";

import Database from "../ORM/index.js";
import IntegrationAccountRepository from "../data/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../data/integrationPropertyRepository.js";
import IntegrationRoomTypeRepository from "../data/integrationRoomTypeRepository.js";
import ChannexSyncEvidenceRepository from "../data/channexSyncEvidenceRepository.js";
import ChannexCredentialStore from "./channexCredentialStore.js";
import ChannexProviderClient from "./channexProviderClient.js";
import { hasChannexRequiredCredentialFields } from "./channexCredentialUtils.js";

const ACTIVE_BOOKING_STATUSES = new Set(["awaiting payment", "paid"]);
const SUPPORTED_TRIGGERS = new Set(["BOOKING_CREATED", "BOOKING_MODIFIED"]);
const DAY_MS = 24 * 60 * 60 * 1000;

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const quoteIdentifier = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
const compareAlphabetically = (left, right) => String(left).localeCompare(String(right));

const resolveDatabaseSchemaName = (client) => {
  if (process.env.TEST === "true") return "test";

  const schema = requireStr(client?.options?.schema);
  if (!schema) return "main";

  return schema.toLowerCase() === "public" ? "main" : schema.trim().toLowerCase();
};

const qualifyTableName = (client, tableName) =>
  `${quoteIdentifier(resolveDatabaseSchemaName(client))}.${quoteIdentifier(tableName)}`;

const parseJsonOrNull = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
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
  httpStatus: error?.status ?? error?.httpStatus ?? null,
});

const normalizeMs = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(Math.trunc(numeric)).length <= 10 ? Math.trunc(numeric) * 1000 : Math.trunc(numeric);
  }

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const utcStartMs = (value) => {
  const ms = normalizeMs(value);
  if (!Number.isFinite(ms)) return null;

  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const msToIsoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

const bookingArrival = (booking) => booking?.arrivaldate ?? booking?.arrivalDate ?? booking?.arrival_date;
const bookingDeparture = (booking) => booking?.departuredate ?? booking?.departureDate ?? booking?.departure_date;

const getBookingId = (booking) =>
  requireStr(booking?.id) || requireStr(booking?.bookingId) || requireStr(booking?.booking_id);

const getPropertyId = (booking) =>
  requireStr(booking?.property_id) || requireStr(booking?.propertyId) || requireStr(booking?.domitsPropertyId);

const getHostId = (booking) => requireStr(booking?.hostid) || requireStr(booking?.hostId) || null;

const isActiveBookingStatus = (status) => ACTIVE_BOOKING_STATUSES.has(String(status || "").trim().toLowerCase());

export const buildBookingNightDateKeys = (booking) => {
  const start = utcStartMs(bookingArrival(booking));
  const end = utcStartMs(bookingDeparture(booking));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const dates = [];
  for (let cursor = start; cursor < end; cursor += DAY_MS) {
    dates.push(msToIsoDate(cursor));
  }
  return dates;
};

export const getAffectedDateKeysForBookingChange = ({ bookingBefore, bookingAfter, trigger }) => {
  if (trigger === "BOOKING_CREATED") {
    return buildBookingNightDateKeys(bookingAfter).sort(compareAlphabetically);
  }

  if (trigger === "BOOKING_MODIFIED") {
    return Array.from(
      new Set([...buildBookingNightDateKeys(bookingBefore), ...buildBookingNightDateKeys(bookingAfter)])
    ).sort(compareAlphabetically);
  }

  return [];
};

const getAffectedRangeMs = (affectedDates) => {
  if (!affectedDates.length) return { fromMs: null, toMs: null };
  const firstMs = new Date(`${affectedDates[0]}T00:00:00.000Z`).getTime();
  const lastMs = new Date(`${affectedDates[affectedDates.length - 1]}T00:00:00.000Z`).getTime();
  return {
    fromMs: firstMs,
    toMs: lastMs + DAY_MS,
  };
};

const bookingOverlapsNight = (booking, dateKey) => {
  const arrival = utcStartMs(bookingArrival(booking));
  const departure = utcStartMs(bookingDeparture(booking));
  const nightStart = new Date(`${dateKey}T00:00:00.000Z`).getTime();
  const nightEnd = nightStart + DAY_MS;

  return Number.isFinite(arrival) && Number.isFinite(departure) && arrival < nightEnd && departure > nightStart;
};

export const countActiveBookingsByNight = (bookings, affectedDates) => {
  const counts = Object.fromEntries((Array.isArray(affectedDates) ? affectedDates : []).map((date) => [date, 0]));

  for (const booking of Array.isArray(bookings) ? bookings : []) {
    if (!isActiveBookingStatus(booking?.status)) continue;

    for (const date of Object.keys(counts)) {
      if (bookingOverlapsNight(booking, date)) counts[date] += 1;
    }
  }

  return counts;
};

const normalizeNonNegativeInteger = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : null;
};

const collectTaskIds = (results) =>
  Array.from(
    new Set(
      (Array.isArray(results) ? results : [])
        .map((result) => requireStr(result?.taskId))
        .filter(Boolean)
    )
  );

const collectWarnings = (results) =>
  (Array.isArray(results) ? results : []).flatMap((result) =>
    Array.isArray(result?.warnings) ? result.warnings.filter((warning) => warning !== undefined && warning !== null) : []
  );

const collectErrors = (results) =>
  (Array.isArray(results) ? results : [])
    .filter((result) => result?.success === false || result?.errorCode || result?.errorMessage)
    .map((result) => ({
      externalPropertyId: result?.externalPropertyId ?? null,
      externalRoomTypeId: result?.externalRoomTypeId ?? null,
      errorCode: result?.errorCode ?? null,
      errorMessage: result?.errorMessage ?? null,
      httpStatus: result?.httpStatus ?? null,
    }));

const normalizeProviderResult = (result) => ({
  endpoint: result?.endpoint ?? null,
  method: result?.method ?? null,
  externalPropertyId: result?.externalPropertyId ?? null,
  externalRoomTypeId: result?.externalRoomTypeId ?? null,
  providerStatus: result?.providerStatus ?? null,
  httpStatus: result?.httpStatus ?? null,
  success: !!result?.success,
  taskId: result?.taskId ?? null,
  warnings: Array.isArray(result?.warnings) ? result.warnings : [],
  errorCode: result?.errorCode ?? null,
  errorMessage: result?.errorMessage ?? null,
});

const summarizeRequestValues = (values) => ({
  valuesOmitted: true,
  valueCount: Array.isArray(values) ? values.length : 0,
  firstDate: Array.isArray(values) && values.length ? values[0]?.date ?? null : null,
  lastDate: Array.isArray(values) && values.length ? values[values.length - 1]?.date ?? null : null,
  externalPropertyIds: Array.from(new Set((Array.isArray(values) ? values : []).map((value) => value?.property_id).filter(Boolean))),
  externalRoomTypeIds: Array.from(new Set((Array.isArray(values) ? values : []).map((value) => value?.room_type_id).filter(Boolean))),
});

const createBaseEvidence = ({ bookingId, trigger, domitsPropertyId, affectedDates }) => ({
  bookingId: bookingId ?? null,
  trigger,
  syncType: "booking-availability",
  domitsPropertyId: domitsPropertyId ?? null,
  channexPropertyId: null,
  externalRoomTypeId: null,
  countOfRooms: null,
  countOfRoomsSource: null,
  affectedDateRange: {
    dateFrom: affectedDates[0] ?? null,
    dateTo: affectedDates[affectedDates.length - 1] ?? null,
  },
  affectedDates,
  availabilityValuesSent: [],
  requestCount: 0,
  taskIds: [],
  warnings: [],
  errors: [],
  overallSuccess: false,
  skipped: false,
});

const withSkip = (evidence, reason, extra = {}) => ({
  ...evidence,
  ...extra,
  overallSuccess: false,
  skipped: true,
  reason,
});

export class ChannexBookingAvailabilityRepository {
  async listActiveBookingsOverlappingRange(propertyId, fromMs, toMs, excludeBookingId = null) {
    const normalizedPropertyId = requireStr(propertyId);
    if (!normalizedPropertyId || !Number.isFinite(Number(fromMs)) || !Number.isFinite(Number(toMs))) return [];

    const client = await Database.getInstance();
    const params = [
      normalizedPropertyId,
      Math.trunc(Number(fromMs)),
      Math.trunc(Number(toMs)),
      ...Array.from(ACTIVE_BOOKING_STATUSES),
    ];
    const activeStatusPlaceholders = Array.from(ACTIVE_BOOKING_STATUSES)
      .map((_, index) => `$${index + 4}`)
      .join(", ");
    const excludeClause = requireStr(excludeBookingId) ? `AND id <> $${params.length + 1}` : "";
    if (excludeClause) params.push(requireStr(excludeBookingId));

    const rows = await client.query(
      `
        SELECT id, property_id, arrivaldate, departuredate, status
        FROM ${qualifyTableName(client, "booking")}
        WHERE property_id = $1
          AND arrivaldate < $3
          AND departuredate > $2
          AND LOWER(status) IN (${activeStatusPlaceholders})
          ${excludeClause}
        ORDER BY arrivaldate ASC
      `,
      params
    );

    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: requireStr(row?.id),
      property_id: requireStr(row?.property_id),
      arrivaldate: normalizeMs(row?.arrivaldate),
      departuredate: normalizeMs(row?.departuredate),
      status: row?.status ?? null,
    }));
  }
}

export default class ChannexBookingAvailabilityBridge {
  constructor({
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    roomTypes = new IntegrationRoomTypeRepository(),
    bookingRepository = new ChannexBookingAvailabilityRepository(),
    channexEvidence = new ChannexSyncEvidenceRepository(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
  } = {}) {
    this.accounts = accounts;
    this.props = props;
    this.roomTypes = roomTypes;
    this.bookingRepository = bookingRepository;
    this.channexEvidence = channexEvidence;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
  }

  async resolveCredentials(integration) {
    const credentialsRef = requireStr(integration?.credentialsRef);
    if (!credentialsRef) {
      return { ok: false, reason: "CHANNEX_RECONNECT_REQUIRED", secret: null };
    }

    const secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    if (!secret || typeof secret !== "object" || Array.isArray(secret) || !hasChannexRequiredCredentialFields(secret)) {
      return { ok: false, reason: "CHANNEX_SECRET_INVALID", secret: null };
    }

    return { ok: true, reason: null, secret };
  }

  async resolveCountOfRooms({ secret, externalPropertyId, externalRoomTypeId }) {
    try {
      const result = await this.channexProviderClient.listRoomTypes(secret, externalPropertyId);
      if (result?.success && Array.isArray(result.roomTypes)) {
        const matched = result.roomTypes.find((roomType) => roomType?.externalRoomTypeId === externalRoomTypeId);
        const countOfRooms = normalizeNonNegativeInteger(
          matched?.countOfRooms ?? matched?.count_of_rooms ?? matched?.count
        );
        if (countOfRooms !== null) {
          return {
            countOfRooms,
            countOfRoomsSource: "CHANNEX_ROOM_TYPE",
          };
        }
      }
    } catch {
      // Fall through to the MVP single-unit default below.
    }

    return {
      countOfRooms: 1,
      countOfRoomsSource: "MVP_DEFAULT_SINGLE_UNIT",
    };
  }

  async persistEvidence(evidence, integrationAccountId) {
    if (!requireStr(integrationAccountId)) {
      return {
        evidenceId: null,
        evidencePersisted: false,
        evidenceSkipped: true,
        evidenceSkipReason: "CHANNEX_INTEGRATION_ACCOUNT_UNRESOLVED",
      };
    }

    const now = Date.now();
    try {
      const row = {
        id: randomUUID(),
        channel: "CHANNEX",
        provider: "CHANNEX",
        integrationAccountId,
        domitsPropertyId: evidence.domitsPropertyId ?? null,
        syncType: "booking-availability",
        dateFrom: evidence.affectedDateRange?.dateFrom ?? null,
        dateTo: evidence.affectedDateRange?.dateTo ?? null,
        startedAt: now,
        finishedAt: now,
        status: evidence.overallSuccess ? "SUCCESS" : evidence.skipped ? "BLOCKED" : "FAILED",
        overallSuccess: !!evidence.overallSuccess,
        mappingSnapshot: stringifyJsonOrNull({
          channexPropertyId: evidence.channexPropertyId,
          externalRoomTypeId: evidence.externalRoomTypeId,
          countOfRooms: evidence.countOfRooms,
          countOfRoomsSource: evidence.countOfRoomsSource,
          skipped: evidence.skipped,
          reason: evidence.reason ?? null,
        }),
        groupedOutboundPayloadSnapshot: stringifyJsonOrNull({
          requestBody: summarizeRequestValues(evidence.availabilityValuesSent),
        }),
        providerResponseSummary: stringifyJsonOrNull({
          requestCount: evidence.requestCount,
          taskIds: evidence.taskIds,
          warnings: evidence.warnings,
          errors: evidence.errors,
        }),
        taskIds: stringifyJsonOrNull(evidence.taskIds),
        warnings: stringifyJsonOrNull(evidence.warnings),
        errors: stringifyJsonOrNull(evidence.errors),
        notes: stringifyJsonOrNull([
          "Booking lifecycle change-only availability sync. Full Sync and restrictions/rates were not called.",
        ]),
        rawDetails: stringifyJsonOrNull(evidence),
        createdAt: now,
        updatedAt: now,
      };

      await this.channexEvidence.create(row);
      return {
        evidenceId: row.id,
        evidencePersisted: true,
        evidenceSkipped: false,
        evidenceSkipReason: null,
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

  async syncAvailabilityForBookingChange({ userId, bookingBefore = null, bookingAfter = null, trigger } = {}) {
    const normalizedTrigger = requireStr(trigger);
    const normalizedUserId = requireStr(userId) || getHostId(bookingAfter) || getHostId(bookingBefore);
    const referenceBooking = bookingAfter || bookingBefore || {};
    const bookingId = getBookingId(referenceBooking);
    const domitsPropertyId = getPropertyId(referenceBooking);
    const affectedDates = getAffectedDateKeysForBookingChange({ bookingBefore, bookingAfter, trigger: normalizedTrigger });
    let integrationAccountId = null;
    let evidence = createBaseEvidence({
      bookingId,
      trigger: normalizedTrigger,
      domitsPropertyId,
      affectedDates,
    });

    const finish = async (nextEvidence) => {
      const evidenceMeta = await this.persistEvidence(nextEvidence, integrationAccountId);
      return {
        ...nextEvidence,
        ...evidenceMeta,
      };
    };

    if (!SUPPORTED_TRIGGERS.has(normalizedTrigger)) {
      return finish(withSkip(evidence, "CHANNEX_BOOKING_AVAILABILITY_TRIGGER_UNSUPPORTED"));
    }

    if (!normalizedUserId) {
      return finish(withSkip(evidence, "CHANNEX_USER_ID_MISSING"));
    }

    if (!domitsPropertyId) {
      return finish(withSkip(evidence, "DOMITS_PROPERTY_ID_MISSING"));
    }

    if (!affectedDates.length) {
      return finish(withSkip(evidence, "NO_AFFECTED_DATES"));
    }

    let integration;
    try {
      integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      integrationAccountId = requireStr(integration?.id);
      if (!integration || String(integration.status || "").toUpperCase() === "DISCONNECTED") {
        return finish(withSkip(evidence, "CHANNEX_NOT_CONNECTED"));
      }

      const credentialContext = await this.resolveCredentials(integration);
      if (!credentialContext.ok) {
        return finish(withSkip(evidence, credentialContext.reason));
      }

      const propertyMappings = await this.props.listByAccountId(integration.id);
      const propertyMapping =
        (Array.isArray(propertyMappings) ? propertyMappings : []).find(
          (mapping) =>
            mapping.domitsPropertyId === domitsPropertyId &&
            String(mapping.status || "").toUpperCase() === "ACTIVE"
        ) || null;
      const channexPropertyId = requireStr(propertyMapping?.externalPropertyId);
      if (!channexPropertyId) {
        return finish(withSkip(evidence, "CHANNEX_PROPERTY_MAPPING_MISSING"));
      }

      const roomTypeMappings = await this.roomTypes.listByAccountId(integration.id);
      const activeRoomTypeMappings = (Array.isArray(roomTypeMappings) ? roomTypeMappings : []).filter(
        (mapping) =>
          mapping.domitsPropertyId === domitsPropertyId &&
          mapping.externalPropertyId === channexPropertyId &&
          String(mapping.status || "").toUpperCase() === "ACTIVE"
      );

      evidence = {
        ...evidence,
        channexPropertyId,
      };

      if (!activeRoomTypeMappings.length) {
        return finish(withSkip(evidence, "CHANNEX_ROOM_TYPE_MAPPING_MISSING"));
      }

      if (activeRoomTypeMappings.length > 1) {
        return finish(withSkip(evidence, "CHANNEX_ROOM_TYPE_AMBIGUOUS"));
      }

      const roomTypeMapping = activeRoomTypeMappings[0];
      const externalRoomTypeId = requireStr(roomTypeMapping.externalRoomTypeId);
      if (!externalRoomTypeId) {
        return finish(withSkip(evidence, "CHANNEX_ROOM_TYPE_MAPPING_MISSING"));
      }
      evidence = {
        ...evidence,
        externalRoomTypeId,
      };

      const { countOfRooms, countOfRoomsSource } = await this.resolveCountOfRooms({
        secret: credentialContext.secret,
        externalPropertyId: channexPropertyId,
        externalRoomTypeId,
      });
      evidence = {
        ...evidence,
        countOfRooms,
        countOfRoomsSource,
      };

      const { fromMs, toMs } = getAffectedRangeMs(affectedDates);
      // Booking create/modify call this bridge after the booking row is persisted.
      // Counts therefore include the updated booking itself; excluding it here would understate occupied inventory.
      const activeBookings = await this.bookingRepository.listActiveBookingsOverlappingRange(
        domitsPropertyId,
        fromMs,
        toMs
      );
      const activeCountsByNight = countActiveBookingsByNight(activeBookings, affectedDates);
      const availabilityValuesSent = affectedDates.map((date) => ({
        property_id: channexPropertyId,
        room_type_id: externalRoomTypeId,
        date,
        availability: Math.max(0, countOfRooms - (activeCountsByNight[date] || 0)),
      }));

      const providerResult = await this.channexProviderClient.pushAvailability(credentialContext.secret, [
        {
          externalPropertyId: channexPropertyId,
          externalRoomTypeId,
          values: availabilityValuesSent,
        },
      ]);
      const results = (Array.isArray(providerResult?.results) ? providerResult.results : []).map(normalizeProviderResult);
      const warnings = collectWarnings(results);
      const errors = collectErrors(results);
      const taskIds = collectTaskIds(results);

      return finish({
        ...evidence,
        availabilityValuesSent,
        requestCount: 1,
        taskIds,
        warnings,
        errors,
        overallSuccess: !!providerResult?.success && warnings.length === 0 && errors.length === 0,
        skipped: false,
        providerResults: results,
      });
    } catch (error) {
      return finish({
        ...evidence,
        errors: [describeLocalError(error)],
        overallSuccess: false,
        skipped: false,
        reason: "CHANNEX_BOOKING_AVAILABILITY_SYNC_FAILED",
      });
    }
  }
}

export const __testUtils = {
  ACTIVE_BOOKING_STATUSES,
  parseJsonOrNull,
};
