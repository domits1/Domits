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
const parseDurationMetric = (payload) => toNullableNumber(payload?.durationMs);
const parseSurface = (payload) => String(payload?.surface || "").trim().toLowerCase();
const parseViewport = (payload) => String(payload?.viewport || "").trim().toLowerCase();
const WEBSITE_ANALYTICS_SURFACES = Object.freeze(["preview", "live"]);
const WEBSITE_ANALYTICS_VIEWPORTS = Object.freeze(["mobile", "tablet", "desktop"]);

const BUILD_ABANDONMENT_WINDOW_MS = 10 * 60 * 1000;
const EMPTY_EVENT_METRICS = Object.freeze({
  total: 0,
  uniqueDrafts: 0,
  lastOccurredAt: null,
});

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

  const existingOccurredAt = startedAttempts.get(attemptId);
  if (!Number.isFinite(existingOccurredAt) || occurredAt < existingOccurredAt) {
    startedAttempts.set(attemptId, occurredAt);
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
  if (Number.isFinite(durationMs) && durationMs > 0) {
    publishDurations.push(durationMs);
  }
};

const trackCompletedAttempt = (completedAttemptIds, payload) => {
  const attemptId = parseAttemptId(payload);
  if (attemptId) {
    completedAttemptIds.add(attemptId);
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

const accumulateMetricRows = (metricEventRows) => {
  const deleteReasonCounts = new Map();
  const startedAttempts = new Map();
  const completedAttemptIds = new Set();
  const previewReadyDurations = [];
  const publishDurations = [];
  const surfaceViewportDurations = createSurfaceViewportDurationBuckets();

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
      case "WEBSITE_PREVIEW_READY":
        trackPreviewReadyDuration(previewReadyDurations, payload);
        return;
      case "WEBSITE_SITE_PUBLISHED":
        trackPublishDuration(publishDurations, payload);
        return;
      case "WEBSITE_BUILD_SUCCEEDED":
      case "WEBSITE_BUILD_FAILED":
        trackCompletedAttempt(completedAttemptIds, payload);
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
    startedAttempts,
    completedAttemptIds,
    previewReadyDurations,
    publishDurations,
    surfaceViewportDurations,
  };
};

const buildDeletionReasonBreakdown = (deleteReasonCounts) =>
  Array.from(deleteReasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

const countAbandonedAttempts = (startedAttempts, completedAttemptIds) => {
  const abandonmentThreshold = Date.now() - BUILD_ABANDONMENT_WINDOW_MS;
  return Array.from(startedAttempts.entries()).filter(
    ([attemptId, occurredAt]) =>
      Number.isFinite(occurredAt) &&
      occurredAt <= abandonmentThreshold &&
      !completedAttemptIds.has(attemptId)
  ).length;
};

const buildSurfaceViewportSummary = (surfaceViewportDurations, surface, viewport) => {
  const durations = getSurfaceViewportDurations(surfaceViewportDurations, surface, viewport) || [];
  return {
    p75: getPercentile(durations, 75),
    sampleCount: durations.length,
  };
};

export class StandaloneSiteEventRepository {
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
    const standaloneDraftTable = draftTableName(schemaName);
    const standaloneEventTable = eventTableName(schemaName);
    const standaloneSiteTable = siteTableName(schemaName);
    const standaloneSiteDomainTable = siteDomainTableName(schemaName);
    const hasHostScope = typeof hostId === "string" && hostId.trim().length > 0;
    const draftWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const eventWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const siteWhereClause = hasHostScope ? "WHERE site.host_id = $1" : "";
    const queryParameters = hasHostScope ? [hostId] : [];

    const [draftCountRows, eventCountRows, metricEventRows, fallbackAvailabilityRows] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::bigint AS total
         FROM ${standaloneDraftTable}
         ${draftWhereClause}`,
        queryParameters
      ),
      client.query(
        `SELECT
          event_type,
          COUNT(*)::bigint AS total,
          COUNT(DISTINCT draft_id)::bigint AS unique_drafts,
          MAX(occurred_at) AS last_occurred_at
         FROM ${standaloneEventTable}
         ${eventWhereClause}
         GROUP BY event_type`,
        queryParameters
      ),
      client.query(
        `SELECT event_type, occurred_at, payload_json
         FROM ${standaloneEventTable}
         ${eventWhereClause}
         ${hasHostScope ? "AND" : "WHERE"} event_type IN (
           'WEBSITE_DELETED',
           'WEBSITE_BUILD_STARTED',
           'WEBSITE_PREVIEW_READY',
           'WEBSITE_SITE_PUBLISHED',
           'WEBSITE_BUILD_SUCCEEDED',
           'WEBSITE_BUILD_FAILED',
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
         FROM ${standaloneSiteTable} site
         LEFT JOIN ${standaloneSiteDomainTable} fallback_domain
           ON fallback_domain.site_id = site.id
          AND fallback_domain.domain_type = 'FALLBACK'
          AND fallback_domain.is_primary = TRUE
         ${siteWhereClause}`,
        queryParameters
      ),
    ]);

    const eventCounts = buildEventCountMap(eventCountRows);
    const {
      deleteReasonCounts,
      startedAttempts,
      completedAttemptIds,
      previewReadyDurations,
      publishDurations,
      surfaceViewportDurations,
    } = accumulateMetricRows(metricEventRows);
    const deletionReasonBreakdown = buildDeletionReasonBreakdown(deleteReasonCounts);

    const previewMetrics = getEventMetrics(eventCounts, "PUBLIC_PREVIEW_OPENED");
    const draftCreatedMetrics = getEventMetrics(eventCounts, "WEBSITE_DRAFT_CREATED");
    const draftSavedMetrics = getEventMetrics(eventCounts, "WEBSITE_DRAFT_SAVED");
    const livePreviewUpdateMetrics = getEventMetrics(eventCounts, "LIVE_PREVIEW_UPDATED");
    const buildStartedMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_STARTED");
    const buildSucceededMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_SUCCEEDED");
    const buildFailedMetrics = getEventMetrics(eventCounts, "WEBSITE_BUILD_FAILED");
    const deletedWebsiteMetrics = getEventMetrics(eventCounts, "WEBSITE_DELETED");
    const buildStartedCount = buildStartedMetrics.total;
    const buildSucceededCount = buildSucceededMetrics.total;
    const buildFailedCount = buildFailedMetrics.total;
    const buildAbandonedCount = countAbandonedAttempts(startedAttempts, completedAttemptIds);
    const publishedFallbackSiteCount = toCount(fallbackAvailabilityRows?.[0]?.published_site_count);
    const reachableFallbackSiteCount = toCount(fallbackAvailabilityRows?.[0]?.reachable_site_count);
    const previewMobileLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "mobile");
    const previewTabletLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "tablet");
    const previewDesktopLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "preview", "desktop");
    const liveMobileLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "mobile");
    const liveTabletLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "tablet");
    const liveDesktopLcpSummary = buildSurfaceViewportSummary(surfaceViewportDurations, "live", "desktop");

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
      buildAbandonmentRate: toPercentage(buildAbandonedCount, buildStartedCount),
      buildAbandonmentRateSampleCount: buildStartedCount,
      timeToFirstPreviewP95: getPercentile(previewReadyDurations, 95),
      timeToFirstPreviewSampleCount: previewReadyDurations.length,
      timeToPublishP95: getPercentile(publishDurations, 95),
      timeToPublishSampleCount: publishDurations.length,
      publicPreviewViewCount: previewMetrics.total,
      uniquePreviewedWebsiteCount: previewMetrics.uniqueDrafts,
      livePreviewUpdateCount: livePreviewUpdateMetrics.total,
      deletedWebsiteCount: deletedWebsiteMetrics.total,
      lastPublicPreviewAt: previewMetrics.lastOccurredAt,
      lastLivePreviewUpdateAt: livePreviewUpdateMetrics.lastOccurredAt,
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
      fallbackSubdomainAvailability: toPercentage(reachableFallbackSiteCount, publishedFallbackSiteCount),
      fallbackSubdomainAvailabilitySampleCount: publishedFallbackSiteCount,
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
