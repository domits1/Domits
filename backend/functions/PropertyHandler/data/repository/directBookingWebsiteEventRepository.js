import Database from "database";
import { randomUUID } from "node:crypto";

const resolveSchemaName = (client) => {
  if (process.env.TEST === "true") {
    return "test";
  }

  const configuredSchema = client?.options?.schema;
  if (typeof configuredSchema === "string" && configuredSchema.trim()) {
    return configuredSchema.trim();
  }

  return "main";
};

const eventTableName = (schemaName) => `${schemaName}.standalone_site_event`;
const draftTableName = (schemaName) => `${schemaName}.standalone_site_draft`;
const siteTableName = (schemaName) => `${schemaName}.standalone_site`;
const siteDomainTableName = (schemaName) => `${schemaName}.standalone_site_domain`;
const propertyPricingTableName = (schemaName) => `${schemaName}.property_pricing`;
const getConfiguredNumberEnv = (...envNames) => {
  for (const envName of envNames) {
    const rawValue = process.env[envName];
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
      continue;
    }

    return Number(rawValue);
  }

  return Number.NaN;
};
const DIRECT_BOOKING_WEBSITE_MONTHLY_FIXED_COST_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_MONTHLY_FIXED_COST_EUR",
  "STANDALONE_SITE_MONTHLY_FIXED_COST_EUR"
);
const DIRECT_BOOKING_WEBSITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR",
  "STANDALONE_SITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR"
);
const DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS",
  "STANDALONE_SITE_USAGE_WINDOW_DAYS"
);
const DIRECT_BOOKING_WEBSITE_COST_PER_BUILD_ATTEMPT_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_COST_PER_BUILD_ATTEMPT_EUR",
  "STANDALONE_SITE_COST_PER_BUILD_ATTEMPT_EUR"
);
const DIRECT_BOOKING_WEBSITE_COST_PER_DRAFT_SAVE_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_COST_PER_DRAFT_SAVE_EUR",
  "STANDALONE_SITE_COST_PER_DRAFT_SAVE_EUR"
);
const DIRECT_BOOKING_WEBSITE_COST_PER_LIVE_SYNC_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_COST_PER_LIVE_SYNC_EUR",
  "STANDALONE_SITE_COST_PER_LIVE_SYNC_EUR"
);
const DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR",
  "STANDALONE_SITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR"
);
const DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_SITE_OPEN_EUR = getConfiguredNumberEnv(
  "DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_SITE_OPEN_EUR",
  "STANDALONE_SITE_COST_PER_PUBLIC_SITE_OPEN_EUR"
);

const safeParseJson = (rawValue, fallbackValue = {}) => {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

const normalizePayload = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return JSON.stringify(value);
};

const toCount = (rawValue) => {
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const toNullableNumber = (rawValue) => {
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const toPercentage = (numerator, denominator) => {
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return (Number(numerator) / denominator) * 100;
};

const PRICE_COMPARISON_EPSILON = 0.0001;

const getPercentile = (values, percentile) => {
  if (!Array.isArray(values) || values.length < 1) {
    return null;
  }

  const sortedValues = [...values]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (sortedValues.length < 1) {
    return null;
  }

  const clampedPercentile = Math.max(0, Math.min(100, Number(percentile)));
  const rankIndex = Math.max(0, Math.ceil((clampedPercentile / 100) * sortedValues.length) - 1);
  return sortedValues[Math.min(rankIndex, sortedValues.length - 1)];
};

const parseAttemptId = (payload) => String(payload?.attemptId || "").trim();
const parseFlowId = (payload) => String(payload?.flowId || "").trim();
const parseDurationMetric = (payload) => toNullableNumber(payload?.durationMs);
const parseSurface = (payload) => String(payload?.surface || "").trim().toLowerCase();
const parseViewport = (payload) => String(payload?.viewport || "").trim().toLowerCase();
const WEBSITE_ANALYTICS_SURFACES = Object.freeze(["preview", "live"]);
const WEBSITE_ANALYTICS_VIEWPORTS = Object.freeze(["mobile", "tablet", "desktop"]);

const BUILD_ABANDONMENT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REASONABLE_SITE_PUBLISH_DURATION_MS = 30 * 60 * 1000;
const EMPTY_EVENT_METRICS = Object.freeze({
  total: 0,
  uniqueDrafts: 0,
  lastOccurredAt: null,
});

const extractSnapshotRoomRate = (snapshot) =>
  toNullableNumber(snapshot?.pricing?.roomRate ?? snapshot?.pricing?.roomrate);

const areComparablePricesEqual = (left, right) =>
  Number.isFinite(left) &&
  Number.isFinite(right) &&
  Math.abs(Number(left) - Number(right)) < PRICE_COMPARISON_EPSILON;

const summarizePublishedPriceAlignment = (publishedPriceRows) => {
  let comparableSiteCount = 0;
  let mismatchCount = 0;

  (Array.isArray(publishedPriceRows) ? publishedPriceRows : []).forEach((row) => {
    const snapshot = safeParseJson(row?.published_property_snapshot_json, {});
    const publishedRoomRate = extractSnapshotRoomRate(snapshot);
    const currentRoomRate = toNullableNumber(row?.roomrate);

    if (!Number.isFinite(publishedRoomRate) || !Number.isFinite(currentRoomRate)) {
      return;
    }

    comparableSiteCount += 1;
    if (!areComparablePricesEqual(publishedRoomRate, currentRoomRate)) {
      mismatchCount += 1;
    }
  });

  return {
    comparableSiteCount,
    mismatchRate: toPercentage(mismatchCount, comparableSiteCount),
  };
};

const resolveDirectBookingWebsiteMonthlyCostInputs = () => {
  const fixedMonthlyCostEur = Number.isFinite(DIRECT_BOOKING_WEBSITE_MONTHLY_FIXED_COST_EUR)
    ? DIRECT_BOOKING_WEBSITE_MONTHLY_FIXED_COST_EUR
    : null;
  const variableCostPerSiteEur = Number.isFinite(DIRECT_BOOKING_WEBSITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR)
    ? DIRECT_BOOKING_WEBSITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR
    : null;

  return {
    fixedMonthlyCostEur,
    variableCostPerSiteEur,
  };
};

const resolveDirectBookingWebsiteUsageCostInputs = () => ({
  buildAttemptCostEur: Number.isFinite(DIRECT_BOOKING_WEBSITE_COST_PER_BUILD_ATTEMPT_EUR)
    ? DIRECT_BOOKING_WEBSITE_COST_PER_BUILD_ATTEMPT_EUR
    : 0,
  draftSaveCostEur: Number.isFinite(DIRECT_BOOKING_WEBSITE_COST_PER_DRAFT_SAVE_EUR)
    ? DIRECT_BOOKING_WEBSITE_COST_PER_DRAFT_SAVE_EUR
    : 0,
  liveSyncCostEur: Number.isFinite(DIRECT_BOOKING_WEBSITE_COST_PER_LIVE_SYNC_EUR)
    ? DIRECT_BOOKING_WEBSITE_COST_PER_LIVE_SYNC_EUR
    : 0,
  publicPreviewOpenCostEur: Number.isFinite(DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR)
    ? DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR
    : 0,
  publicSiteOpenCostEur: Number.isFinite(DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_SITE_OPEN_EUR)
    ? DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_SITE_OPEN_EUR
    : 0,
});

const hasConfiguredDirectBookingWebsiteUsageCosts = () => {
  const { fixedMonthlyCostEur, variableCostPerSiteEur } = resolveDirectBookingWebsiteMonthlyCostInputs();
  const usageInputs = resolveDirectBookingWebsiteUsageCostInputs();

  return (
    Number.isFinite(fixedMonthlyCostEur) ||
    Number.isFinite(variableCostPerSiteEur) ||
    Object.values(usageInputs).some((value) => Number.isFinite(value) && value > 0)
  );
};

const buildRecentUsageCountMap = (recentUsageRows) =>
  new Map(
    (Array.isArray(recentUsageRows) ? recentUsageRows : []).map((row) => [
      String(row.event_type || "").trim(),
      toCount(row.total),
    ])
  );

const getRecentUsageCount = (recentUsageCounts, eventType) => toCount(recentUsageCounts.get(eventType));

const calculateUsageWeightedCostPerActiveSitePerMonth = ({
  activePublishedSiteCount,
  recentUsageCounts,
}) => {
  if (!Number.isFinite(activePublishedSiteCount) || activePublishedSiteCount <= 0) {
    return null;
  }

  if (!hasConfiguredDirectBookingWebsiteUsageCosts()) {
    return null;
  }

  const { fixedMonthlyCostEur, variableCostPerSiteEur } = resolveDirectBookingWebsiteMonthlyCostInputs();
  const {
    buildAttemptCostEur,
    draftSaveCostEur,
    liveSyncCostEur,
    publicPreviewOpenCostEur,
    publicSiteOpenCostEur,
  } = resolveDirectBookingWebsiteUsageCostInputs();

  const monthlyFixedCost = Number.isFinite(fixedMonthlyCostEur) ? fixedMonthlyCostEur : 0;
  const monthlyVariableCost = Number.isFinite(variableCostPerSiteEur)
    ? variableCostPerSiteEur * activePublishedSiteCount
    : 0;
  const recentUsageCost =
    getRecentUsageCount(recentUsageCounts, "WEBSITE_BUILD_STARTED") * buildAttemptCostEur +
    getRecentUsageCount(recentUsageCounts, "WEBSITE_DRAFT_SAVED") * draftSaveCostEur +
    (
      getRecentUsageCount(recentUsageCounts, "WEBSITE_SITE_PUBLISHED") +
      getRecentUsageCount(recentUsageCounts, "LIVE_SITE_UPDATED")
    ) * liveSyncCostEur +
    getRecentUsageCount(recentUsageCounts, "PUBLIC_PREVIEW_OPENED") * publicPreviewOpenCostEur +
    getRecentUsageCount(recentUsageCounts, "PUBLIC_SITE_OPENED") * publicSiteOpenCostEur;

  return (monthlyFixedCost + monthlyVariableCost + recentUsageCost) / activePublishedSiteCount;
};

const buildEventCountMap = (eventCountRows) =>
  new Map(
    (Array.isArray(eventCountRows) ? eventCountRows : []).map((row) => [
      String(row.event_type || "").trim(),
      {
        total: toCount(row.total),
        uniqueDrafts: toCount(row.unique_drafts),
        lastOccurredAt: row.last_occurred_at ? Number(row.last_occurred_at) : null,
      },
    ])
  );

const getEventMetrics = (eventCounts, eventType) => eventCounts.get(eventType) || EMPTY_EVENT_METRICS;
const getMergedEventMetrics = (eventCounts, eventTypes) =>
  (Array.isArray(eventTypes) ? eventTypes : []).reduce(
    (mergedMetrics, eventType) => {
      const eventMetrics = getEventMetrics(eventCounts, eventType);
      return {
        total: mergedMetrics.total + eventMetrics.total,
        uniqueDrafts: Math.max(mergedMetrics.uniqueDrafts, eventMetrics.uniqueDrafts),
        lastOccurredAt: Math.max(mergedMetrics.lastOccurredAt || 0, eventMetrics.lastOccurredAt || 0) || null,
      };
    },
    {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    }
  );

const trackDeleteReasons = (deleteReasonCounts, payload) => {
  const reasons = Array.isArray(payload?.reasons) ? payload.reasons : [];
  reasons.forEach((reason) => {
    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) {
      return;
    }

    deleteReasonCounts.set(normalizedReason, (deleteReasonCounts.get(normalizedReason) || 0) + 1);
  });
};

const trackStartedAttempt = (startedAttempts, payload, occurredAt) => {
  const attemptId = parseAttemptId(payload);
  if (!attemptId || !Number.isFinite(occurredAt)) {
    return;
  }

  const flowId = parseFlowId(payload);
  const nextAttemptState = {
    occurredAt,
    flowKey: flowId ? `flow:${flowId}` : `attempt:${attemptId}`,
  };

  const existingAttemptState = startedAttempts.get(attemptId);
  if (!Number.isFinite(existingAttemptState?.occurredAt) || occurredAt < existingAttemptState.occurredAt) {
    startedAttempts.set(attemptId, nextAttemptState);
  }
};

const trackPreviewReadyDuration = (previewReadyDurations, payload) => {
  const durationMs = parseDurationMetric(payload);
  if (Number.isFinite(durationMs) && durationMs > 0) {
    previewReadyDurations.push(durationMs);
  }
};

const trackPublishDuration = (publishDurations, payload) => {
  const durationMs = parseDurationMetric(payload);
  if (
    Number.isFinite(durationMs) &&
    durationMs > 0 &&
    durationMs <= MAX_REASONABLE_SITE_PUBLISH_DURATION_MS
  ) {
    publishDurations.push(durationMs);
  }
};

const trackCompletedAttempt = (completedAttemptIds, payload) => {
  const attemptId = parseAttemptId(payload);
  if (attemptId) {
    completedAttemptIds.add(attemptId);
  }
};

const trackStartedBuildFlow = (startedFlowIds, payload) => {
  const flowId = parseFlowId(payload);
  if (flowId) {
    startedFlowIds.add(`flow:${flowId}`);
  }
};

const trackAbandonedBuildFlow = (abandonedBuildFlowIds, payload) => {
  const flowId = parseFlowId(payload);
  if (flowId) {
    abandonedBuildFlowIds.add(`flow:${flowId}`);
  }
};

const trackCompletedBuildFlow = (completedBuildFlowIds, payload) => {
  const flowId = parseFlowId(payload);
  const attemptId = parseAttemptId(payload);
  if (flowId) {
    completedBuildFlowIds.add(`flow:${flowId}`);
    return;
  }

  if (attemptId) {
    completedBuildFlowIds.add(`attempt:${attemptId}`);
  }
};

const createSurfaceViewportDurationBuckets = () =>
  Object.fromEntries(
    WEBSITE_ANALYTICS_SURFACES.map((surface) => [
      surface,
      Object.fromEntries(WEBSITE_ANALYTICS_VIEWPORTS.map((viewport) => [viewport, []])),
    ])
  );

const getSurfaceViewportDurations = (surfaceViewportDurations, surface, viewport) => {
  if (!surfaceViewportDurations?.[surface] || !Array.isArray(surfaceViewportDurations[surface][viewport])) {
    return null;
  }

  return surfaceViewportDurations[surface][viewport];
};

const trackSiteLcpMetric = (surfaceViewportDurations, payload) => {
  const surface = parseSurface(payload);
  const viewport = parseViewport(payload);
  const durationMs = parseDurationMetric(payload);
  const targetDurations = getSurfaceViewportDurations(surfaceViewportDurations, surface, viewport);

  if (!targetDurations || !Number.isFinite(durationMs) || durationMs <= 0) {
    return;
  }

  targetDurations.push(durationMs);
};

const trackOpenedSiteProperty = (openedSitePropertyIds, row) => {
  const propertyId = String(row?.property_id || "").trim();
  if (propertyId) {
    openedSitePropertyIds.add(propertyId);
  }
};

const accumulateMetricRows = (metricEventRows) => {
  const deleteReasonCounts = new Map();
  const startedFlowIds = new Set();
  const abandonedBuildFlowIds = new Set();
  const startedAttempts = new Map();
  const completedAttemptIds = new Set();
  const completedBuildFlowIds = new Set();
  const previewReadyDurations = [];
  const publishDurations = [];
  const surfaceViewportDurations = createSurfaceViewportDurationBuckets();
  const openedSitePropertyIds = new Set();

  (Array.isArray(metricEventRows) ? metricEventRows : []).forEach((row) => {
    const eventType = String(row.event_type || "").trim();
    const occurredAt = toNullableNumber(row.occurred_at);
    const payload = safeParseJson(row.payload_json, {});

    switch (eventType) {
      case "WEBSITE_DELETED":
        trackDeleteReasons(deleteReasonCounts, payload);
        return;
      case "WEBSITE_BUILD_STARTED":
        trackStartedAttempt(startedAttempts, payload, occurredAt);
        return;
      case "WEBSITE_BUILD_FLOW_STARTED":
        trackStartedBuildFlow(startedFlowIds, payload);
        return;
      case "WEBSITE_BUILD_FLOW_ABANDONED":
        trackAbandonedBuildFlow(abandonedBuildFlowIds, payload);
        return;
      case "WEBSITE_PREVIEW_READY":
        trackPreviewReadyDuration(previewReadyDurations, payload);
        return;
      case "WEBSITE_SITE_PUBLISHED":
        trackPublishDuration(publishDurations, payload);
        return;
      case "WEBSITE_BUILD_SUCCEEDED":
      case "WEBSITE_BUILD_FAILED":
        trackCompletedAttempt(completedAttemptIds, payload);
        trackCompletedBuildFlow(completedBuildFlowIds, payload);
        return;
      case "PUBLIC_PREVIEW_OPENED":
      case "PUBLIC_SITE_OPENED":
        trackOpenedSiteProperty(openedSitePropertyIds, row);
        return;
      case "SITE_LCP_RECORDED":
        trackSiteLcpMetric(surfaceViewportDurations, payload);
        return;
      default:
        return;
    }
  });

  return {
    deleteReasonCounts,
    startedFlowIds,
    abandonedBuildFlowIds,
    startedAttempts,
    completedAttemptIds,
    completedBuildFlowIds,
    previewReadyDurations,
    publishDurations,
    surfaceViewportDurations,
    openedSitePropertyIds,
  };
};

const buildDeletionReasonBreakdown = (deleteReasonCounts) =>
  Array.from(deleteReasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

const summarizeBuildFlowClosure = ({
  startedFlowIds,
  abandonedBuildFlowIds,
  startedAttempts,
  completedAttemptIds,
  completedBuildFlowIds,
}) => {
  const abandonmentThreshold = Date.now() - BUILD_ABANDONMENT_WINDOW_MS;
  const staleBuildFlowIds = new Set();

  Array.from(startedAttempts.entries()).forEach(([attemptId, attemptState]) => {
    const occurredAt = attemptState?.occurredAt;
    if (!Number.isFinite(occurredAt)) {
      return;
    }

    if (occurredAt <= abandonmentThreshold && !completedAttemptIds.has(attemptId)) {
      staleBuildFlowIds.add(String(attemptState?.flowKey || `attempt:${attemptId}`).trim());
    }
  });

  const maturedFlowIds = new Set([
    ...Array.from(completedBuildFlowIds),
    ...Array.from(abandonedBuildFlowIds),
    ...Array.from(staleBuildFlowIds),
  ]);
  const abandonedFlowIds = new Set([
    ...Array.from(abandonedBuildFlowIds),
    ...Array.from(staleBuildFlowIds),
  ]);

  return {
    startedFlowCount: startedFlowIds.size,
    explicitPreBuildAbandonCount: abandonedBuildFlowIds.size,
    staleBuildFlowCount: staleBuildFlowIds.size,
    abandonedCount: abandonedFlowIds.size,
    maturedCount: maturedFlowIds.size,
  };
};

const buildSurfaceViewportSummary = (surfaceViewportDurations, surface, viewport) => {
  const durations = getSurfaceViewportDurations(surfaceViewportDurations, surface, viewport) || [];
  return {
    p75: getPercentile(durations, 75),
    sampleCount: durations.length,
  };
};

const buildMergedViewportSummary = (surfaceViewportDurations, viewport) => {
  const mergedDurations = WEBSITE_ANALYTICS_SURFACES.flatMap(
    (surface) => getSurfaceViewportDurations(surfaceViewportDurations, surface, viewport) || []
  );

  return {
    p75: getPercentile(mergedDurations, 75),
    sampleCount: mergedDurations.length,
  };
};

export class DirectBookingWebsiteEventRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async recordEvent({ draftId = null, propertyId = null, hostId, eventType, payload = null }) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = eventTableName(schemaName);
    const occurredAt = Date.now();

    await client.query(
      `INSERT INTO ${tableName} (
        id,
        draft_id,
        property_id,
        host_id,
        event_type,
        payload_json,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        draftId,
        propertyId,
        hostId,
        String(eventType || "").trim(),
        normalizePayload(payload),
        occurredAt,
      ]
    );
  }

  async getKpiSummary({ hostId = null } = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const directBookingWebsiteDraftTable = draftTableName(schemaName);
    const directBookingWebsiteEventTable = eventTableName(schemaName);
    const directBookingWebsiteSiteTable = siteTableName(schemaName);
    const directBookingWebsiteDomainTable = siteDomainTableName(schemaName);
    const propertyPricingTable = propertyPricingTableName(schemaName);
    const hasHostScope = typeof hostId === "string" && hostId.trim().length > 0;
    const draftWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const eventWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const siteWhereClause = hasHostScope ? "WHERE site.host_id = $1" : "";
    const queryParameters = hasHostScope ? [hostId] : [];
    const usageWindowDays = Number.isFinite(DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS) && DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS > 0
      ? Math.round(DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS)
      : 30;
    const usageWindowStartedAt = Date.now() - usageWindowDays * 24 * 60 * 60 * 1000;
    const recentUsageWhereClause = hasHostScope
      ? "WHERE host_id = $1 AND occurred_at >= $2"
      : "WHERE occurred_at >= $1";
    const recentUsageParameters = hasHostScope ? [hostId, usageWindowStartedAt] : [usageWindowStartedAt];

    const [
      draftCountRows,
      eventCountRows,
      metricEventRows,
      liveLinkAvailabilityRows,
      publishedPriceRows,
      recentUsageRows,
    ] =
      await Promise.all([
      client.query(
        `SELECT COUNT(*)::bigint AS total
         FROM ${directBookingWebsiteDraftTable}
         ${draftWhereClause}`,
        queryParameters
      ),
      client.query(
        `SELECT
          event_type,
          COUNT(*)::bigint AS total,
          COUNT(DISTINCT draft_id)::bigint AS unique_drafts,
          MAX(occurred_at) AS last_occurred_at
         FROM ${directBookingWebsiteEventTable}
         ${eventWhereClause}
         GROUP BY event_type`,
        queryParameters
      ),
      client.query(
        `SELECT event_type, occurred_at, payload_json, property_id
         FROM ${directBookingWebsiteEventTable}
         ${eventWhereClause}
         ${hasHostScope ? "AND" : "WHERE"} event_type IN (
           'WEBSITE_BUILD_FLOW_STARTED',
           'WEBSITE_BUILD_FLOW_ABANDONED',
           'WEBSITE_DELETED',
           'WEBSITE_BUILD_STARTED',
           'WEBSITE_PREVIEW_READY',
           'WEBSITE_SITE_PUBLISHED',
           'WEBSITE_BUILD_SUCCEEDED',
           'WEBSITE_BUILD_FAILED',
           'PUBLIC_PREVIEW_OPENED',
           'PUBLIC_SITE_OPENED',
           'SITE_LCP_RECORDED'
         )`,
        queryParameters
      ),
      client.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN site.status = 'PUBLISHED' THEN site.id END)::bigint AS published_site_count,
           COUNT(
             DISTINCT CASE
               WHEN site.status = 'PUBLISHED' AND fallback_domain.status = 'ACTIVE'
               THEN site.id
             END
           )::bigint AS reachable_site_count
         FROM ${directBookingWebsiteSiteTable} site
         LEFT JOIN ${directBookingWebsiteDomainTable} fallback_domain
           ON fallback_domain.site_id = site.id
          AND fallback_domain.domain_type = 'FALLBACK'
          AND fallback_domain.is_primary = TRUE
         ${siteWhereClause}`,
        queryParameters
      ),
      client.query(
        `SELECT
           site.id,
           site.property_id,
           site.published_property_snapshot_json,
           pricing.roomrate
         FROM ${directBookingWebsiteSiteTable} site
         LEFT JOIN ${propertyPricingTable} pricing
           ON pricing.property_id = site.property_id
         ${siteWhereClause}
         ${hasHostScope ? "AND" : "WHERE"} site.status = 'PUBLISHED'`,
        queryParameters
      ),
      client.query(
        `SELECT
           event_type,
           COUNT(*)::bigint AS total
         FROM ${directBookingWebsiteEventTable}
         ${recentUsageWhereClause}
         AND event_type IN (
           'WEBSITE_BUILD_STARTED',
           'WEBSITE_DRAFT_SAVED',
           'WEBSITE_SITE_PUBLISHED',
           'LIVE_SITE_UPDATED',
           'PUBLIC_PREVIEW_OPENED',
           'PUBLIC_SITE_OPENED'
         )
         GROUP BY event_type`,
        recentUsageParameters
      ),
    ]);

    const eventCounts = buildEventCountMap(eventCountRows);
    const {
      deleteReasonCounts,
      startedFlowIds,
      abandonedBuildFlowIds,
      startedAttempts,
      completedAttemptIds,
      completedBuildFlowIds,
      previewReadyDurations,
      publishDurations,
      surfaceViewportDurations,
      openedSitePropertyIds,
    } = accumulateMetricRows(metricEventRows);
    const deletionReasonBreakdown = buildDeletionReasonBreakdown(deleteReasonCounts);

    const previewMetrics = getEventMetrics(eventCounts, "PUBLIC_PREVIEW_OPENED");
    const liveSiteOpenMetrics = getMergedEventMetrics(eventCounts, [
      "PUBLIC_PREVIEW_OPENED",
      "PUBLIC_SITE_OPENED",
    ]);
    const draftCreatedMetrics = getEventMetrics(eventCounts, "WEBSITE_DRAFT_CREATED");
    const draftSavedMetrics = getEventMetrics(eventCounts, "WEBSITE_DRAFT_SAVED");
    const liveSiteUpdateMetrics = getMergedEventMetrics(eventCounts, [
      "LIVE_PREVIEW_UPDATED",
      "LIVE_SITE_UPDATED",
    ]);
    const buildStartedMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_STARTED");
    const buildSucceededMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_SUCCEEDED");
    const buildFailedMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_FAILED");
    const deletedWebsiteMetrics = getEventMetrics(eventCounts, "WEBSITE_DELETED");
    const buildStartedCount = buildStartedMetrics.total;
    const buildSucceededCount = buildSucceededMetrics.total;
    const buildFailedCount = buildFailedMetrics.total;
    const buildAttemptClosureSummary = summarizeBuildFlowClosure({
      startedFlowIds,
      abandonedBuildFlowIds,
      startedAttempts,
      completedAttemptIds,
      completedBuildFlowIds,
    });
    const buildAbandonedCount = buildAttemptClosureSummary.abandonedCount;
    const publishedLiveSiteCount = toCount(liveLinkAvailabilityRows?.[0]?.published_site_count);
    const reachableLiveSiteCount = toCount(liveLinkAvailabilityRows?.[0]?.reachable_site_count);
    const recentUsageCounts = buildRecentUsageCountMap(recentUsageRows);
    const publishedPriceAlignmentSummary = summarizePublishedPriceAlignment(publishedPriceRows);
    const costPerActiveSitePerMonth = calculateUsageWeightedCostPerActiveSitePerMonth({
      activePublishedSiteCount: publishedLiveSiteCount,
      recentUsageCounts,
    });
    const previewMobileLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "mobile");
    const previewTabletLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "tablet");
    const previewDesktopLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "desktop");
    const liveMobileLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "mobile");
    const liveTabletLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "tablet");
    const liveDesktopLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "desktop");
    const mergedMobileLcpSummary = buildMergedViewportSummary(surfaceViewportDurations, "mobile");
    const mergedTabletLcpSummary = buildMergedViewportSummary(surfaceViewportDurations, "tablet");
    const mergedDesktopLcpSummary = buildMergedViewportSummary(surfaceViewportDurations, "desktop");

    return {
      currentDraftCount: toCount(draftCountRows?.[0]?.total),
      draftCreatedCount: draftCreatedMetrics.total,
      draftSaveCount: draftSavedMetrics.total,
      buildStartedCount,
      buildSucceededCount,
      buildFailedCount,
      buildAbandonedCount,
      buildSuccessRate: toPercentage(buildSucceededCount, buildStartedCount),
      buildSuccessRateSampleCount: buildStartedCount,
      buildFailureRate: toPercentage(buildFailedCount, buildStartedCount),
      buildFailureRateSampleCount: buildStartedCount,
      buildAbandonmentRate: toPercentage(
        buildAbandonedCount,
        buildAttemptClosureSummary.maturedCount
      ),
      buildAbandonmentRateSampleCount: buildAttemptClosureSummary.maturedCount,
      timeToFirstPreviewP95: getPercentile(previewReadyDurations, 95),
      timeToFirstPreviewSampleCount: previewReadyDurations.length,
      timeToPublishP95: getPercentile(publishDurations, 95),
      timeToPublishSampleCount: publishDurations.length,
      costPerActiveSitePerMonth,
      costPerActiveSitePerMonthSampleCount: Number.isFinite(costPerActiveSitePerMonth)
        ? publishedLiveSiteCount
        : 0,
      publicPreviewViewCount: previewMetrics.total,
      uniquePreviewedWebsiteCount: previewMetrics.uniqueDrafts,
      uniqueLiveSiteCount: openedSitePropertyIds.size,
      liveSiteOpenCount: liveSiteOpenMetrics.total,
      liveSiteUpdateCount: liveSiteUpdateMetrics.total,
      deletedWebsiteCount: deletedWebsiteMetrics.total,
      lastPublicPreviewAt: previewMetrics.lastOccurredAt,
      lastLiveSiteOpenAt: liveSiteOpenMetrics.lastOccurredAt,
      lastLiveSiteUpdateAt: liveSiteUpdateMetrics.lastOccurredAt,
      previewSiteLcpMobileP75: previewMobileLcpSummary.p75,
      previewSiteLcpMobileSampleCount: previewMobileLcpSummary.sampleCount,
      previewSiteLcpTabletP75: previewTabletLcpSummary.p75,
      previewSiteLcpTabletSampleCount: previewTabletLcpSummary.sampleCount,
      previewSiteLcpDesktopP75: previewDesktopLcpSummary.p75,
      previewSiteLcpDesktopSampleCount: previewDesktopLcpSummary.sampleCount,
      liveSiteLcpMobileP75: liveMobileLcpSummary.p75,
      liveSiteLcpMobileSampleCount: liveMobileLcpSummary.sampleCount,
      liveSiteLcpTabletP75: liveTabletLcpSummary.p75,
      liveSiteLcpTabletSampleCount: liveTabletLcpSummary.sampleCount,
      liveSiteLcpDesktopP75: liveDesktopLcpSummary.p75,
      liveSiteLcpDesktopSampleCount: liveDesktopLcpSummary.sampleCount,
      siteLcpMobileP75: mergedMobileLcpSummary.p75,
      siteLcpMobileSampleCount: mergedMobileLcpSummary.sampleCount,
      siteLcpTabletP75: mergedTabletLcpSummary.p75,
      siteLcpTabletSampleCount: mergedTabletLcpSummary.sampleCount,
      siteLcpDesktopP75: mergedDesktopLcpSummary.p75,
      siteLcpDesktopSampleCount: mergedDesktopLcpSummary.sampleCount,
      fallbackSubdomainAvailability: toPercentage(reachableLiveSiteCount, publishedLiveSiteCount),
      fallbackSubdomainAvailabilitySampleCount: publishedLiveSiteCount,
      quoteToChargeMismatchRate: publishedPriceAlignmentSummary.mismatchRate,
      quoteToChargeMismatchSampleCount: publishedPriceAlignmentSummary.comparableSiteCount,
      deletionReasonBreakdown,
    };
  }

  async getKpiSummaryByHostId(hostId) {
    return this.getKpiSummary({ hostId });
  }

  async getGlobalKpiSummary() {
    return this.getKpiSummary();
  }
}
