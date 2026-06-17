export const CHANNEL_CHANNEX = "CHANNEX";
export const CHANNEX_BOOKING_POLL_ACTION = "poll-latest-bookings";
export const CHANNEX_BOOKING_POLL_SYNC_TYPE = "booking_poll";
export const CHANNEX_BOOKING_PULL_PROVIDER_ENDPOINT = "/api/v1/booking_revisions/feed";

const CHANNEX_BOOKING_POLL_TRIGGER = "EVENTBRIDGE_POLL";
const CHANNEX_BOOKING_POLL_LOCK_STALE_MS = 5 * 60 * 1000;
const CHANNEX_BOOKING_PULL_COUNT_FIELDS = [
  "fetchedCount",
  "rawPersistedCount",
  "createdBookingCount",
  "updatedBookingCount",
  "cancelledBookingCount",
  "skippedCount",
  "ackedCount",
  "unackedCount",
];

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const parseBooleanEnvLikeValue = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
const parseCsvAllowlist = (value) => {
  if (Array.isArray(value)) {
    return new Set(value.map((item) => requireStr(item)).filter(Boolean));
  }

  return new Set(
    String(value || "")
      .split(",")
      .map((item) => requireStr(item))
      .filter(Boolean)
  );
};

export const allowlistIncludes = (allowlist, value) =>
  allowlist.size === 0 || allowlist.has(requireStr(value));

export const hasRequiredChannexBookingPollAllowlists = (config) =>
  config.accountIds.size > 0 && config.domitsPropertyIds.size > 0;

export const isActiveChannexPropertyMapping = (mapping) =>
  String(mapping?.status || "").toUpperCase() === "ACTIVE";

export const buildChannexBookingPollConfig = (options = {}) => {
  const envEnabled = parseBooleanEnvLikeValue(process.env.CHANNEX_BOOKING_POLL_ENABLED);
  const eventAllowsPolling = Object.hasOwn(options, "enabled")
    ? parseBooleanEnvLikeValue(options.enabled)
    : true;
  const lockStaleMs = Number(options.lockStaleMs ?? process.env.CHANNEX_BOOKING_POLL_LOCK_STALE_MS);

  return {
    enabled: envEnabled && eventAllowsPolling,
    trigger: requireStr(options.trigger) || CHANNEX_BOOKING_POLL_TRIGGER,
    accountIds: parseCsvAllowlist(
      options.accountIds ?? options.integrationAccountIds ?? process.env.CHANNEX_BOOKING_POLL_ACCOUNT_IDS
    ),
    domitsPropertyIds: parseCsvAllowlist(
      options.domitsPropertyIds ?? process.env.CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS
    ),
    lockStaleMs:
      Number.isFinite(lockStaleMs) && lockStaleMs > 0
        ? lockStaleMs
        : CHANNEX_BOOKING_POLL_LOCK_STALE_MS,
  };
};

export const createEmptyChannexBookingPollResponse = ({ enabled, trigger }) => ({
  channel: CHANNEL_CHANNEX,
  action: CHANNEX_BOOKING_POLL_ACTION,
  trigger,
  syncType: CHANNEX_BOOKING_POLL_SYNC_TYPE,
  endpointCalled: CHANNEX_BOOKING_PULL_PROVIDER_ENDPOINT,
  enabled,
  calledProvider: false,
  accountsChecked: 0,
  propertiesChecked: 0,
  propertiesSkippedCount: 0,
  fetchedCount: 0,
  rawPersistedCount: 0,
  createdBookingCount: 0,
  updatedBookingCount: 0,
  cancelledBookingCount: 0,
  skippedCount: 0,
  ackedCount: 0,
  unackedCount: 0,
  accountResults: [],
  propertyResults: [],
  items: [],
  warnings: [],
  errors: [],
  overallSuccess: true,
});

export const buildChannexBookingPollPropertySummary = ({
  integration,
  propertyMapping,
  result,
  statusCode = 200,
  overallSuccess = false,
  counts = {},
  evidenceId = null,
  warnings = [],
  errors = [],
}) => ({
  integrationAccountId: integration?.id ?? null,
  domitsPropertyId: propertyMapping?.domitsPropertyId ?? null,
  externalPropertyId: propertyMapping?.externalPropertyId ?? null,
  result,
  statusCode,
  overallSuccess,
  evidenceId,
  fetchedCount: Number(counts.fetchedCount || 0),
  rawPersistedCount: Number(counts.rawPersistedCount || 0),
  createdBookingCount: Number(counts.createdBookingCount || 0),
  updatedBookingCount: Number(counts.updatedBookingCount || 0),
  cancelledBookingCount: Number(counts.cancelledBookingCount || 0),
  skippedCount: Number(counts.skippedCount || 0),
  ackedCount: Number(counts.ackedCount || 0),
  unackedCount: Number(counts.unackedCount || 0),
  warnings,
  errors,
});

export const applyChannexBookingPollPropertyResult = (aggregate, propertySummary, propertyResponse = {}) => {
  aggregate.propertyResults.push(propertySummary);
  aggregate.calledProvider = aggregate.calledProvider || propertyResponse.calledProvider === true;
  for (const field of CHANNEX_BOOKING_PULL_COUNT_FIELDS) {
    aggregate[field] += Number(propertyResponse?.[field] || 0);
  }
  aggregate.items.push(...(Array.isArray(propertyResponse.items) ? propertyResponse.items : []));
  aggregate.warnings.push(...(Array.isArray(propertyResponse.warnings) ? propertyResponse.warnings : []));
  aggregate.errors.push(...(Array.isArray(propertyResponse.errors) ? propertyResponse.errors : []));
};
