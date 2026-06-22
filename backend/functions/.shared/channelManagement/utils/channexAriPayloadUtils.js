import Database from "../../integrations/ORM/index.js";
import { countActiveBookingsByNight } from "../channexBookingAvailabilityBridge.js";
import {
  addDaysToIsoDate,
  calendarIntToIsoDate,
  isoDateToCalendarInt,
  isoDateToUtcStartMs,
  normalizeValueToCalendarInt,
  parseIsoDateParam,
} from "./channexAriDateUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const compareAlphabetically = (left, right) =>
  String(left).localeCompare(String(right));

const CHANNEX_FULL_SYNC_DEFAULTS = Object.freeze({ VERSION: "full-sync-v1", PROVIDER_REQUEST_TIMEOUT_MS: 8000, DEFAULT_SELLABLE_UNIT_COUNT: 1 });

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

const CHANNEX_CERTIFICATION_FULL_SYNC_DAYS = 500;
const CHANNEX_ARI_PAYLOAD_PREVIEW_DEFAULT_PAGE_SIZE_DAYS = 30;
const CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_PAGE_SIZE_DAYS = 60;
const CHANNEX_ARI_PAYLOAD_PREVIEW_MAX_REQUESTED_DAYS = CHANNEX_CERTIFICATION_FULL_SYNC_DAYS + 1;

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
    lastDateStartMs + DAY_MS
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

export {
  CHANNEX_CERTIFICATION_FULL_SYNC_DAYS,
  CHANNEX_FULL_SYNC_DEFAULTS,
  appendChannexAriPayloadPreviewNotes,
  buildAriPreviewCollections,
  buildAvailabilityOccupancyContext,
  buildAvailabilityPayloadGroups,
  buildAvailabilityPayloadItemsFromReadiness,
  buildCalendarOverrideMap,
  buildCalendarRestrictionOverrideSummary,
  buildChannexAvailabilitySyncPayloads,
  buildChannexPayloadPreviewPaginationContext,
  buildChannexRestrictionMapping,
  buildChannexRestrictionSyncPayloads,
  buildPreviewDateRangeValidationResponse,
  buildRestrictionRateItems,
  buildRestrictionRateItemsFromReadiness,
  buildRestrictionRatePayloadGroups,
  collectChannexRestrictionFieldsFromGroups,
  combineChannexAvailabilitySyncPayloadsForProvider,
  combineChannexRestrictionSyncPayloadsForProvider,
  countInclusiveIsoDateRangeDays,
  createChannexAriPayloadPreviewNotes,
  createChannexAvailabilityPayloadPreviewNotes,
  createChannexRestrictionRatePayloadPreviewNotes,
  getPropertyAvailabilityRestrictions,
  getPropertyAvailabilityWindows,
  getPropertyCalendarOverrides,
  getPropertyPricing,
  normalizeAvailabilityRestrictionRows,
  normalizeAvailabilityWindows,
  summarizeChannexGroupedPayloads,
  summarizeChannexRequestBody,
};
