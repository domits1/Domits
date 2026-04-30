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
    .map((value) => Number(value))
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

const BUILD_ABANDONMENT_WINDOW_MS = 10 * 60 * 1000;

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
    const hasHostScope = typeof hostId === "string" && hostId.trim().length > 0;
    const draftWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const eventWhereClause = hasHostScope ? "WHERE host_id = $1" : "";
    const queryParameters = hasHostScope ? [hostId] : [];

    const [draftCountRows, eventCountRows, metricEventRows] = await Promise.all([
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
           'WEBSITE_BUILD_SUCCEEDED',
           'WEBSITE_BUILD_FAILED',
           'SITE_LCP_RECORDED'
         )`,
        queryParameters
      ),
    ]);

    const eventCounts = new Map(
      (Array.isArray(eventCountRows) ? eventCountRows : []).map((row) => [
        String(row.event_type || "").trim(),
        {
          total: toCount(row.total),
          uniqueDrafts: toCount(row.unique_drafts),
          lastOccurredAt: row.last_occurred_at ? Number(row.last_occurred_at) : null,
        },
      ])
    );

    const deleteReasonCounts = new Map();
    const startedAttempts = new Map();
    const completedAttemptIds = new Set();
    const previewReadyDurations = [];
    const previewMobileLcpDurations = [];
    const liveMobileLcpDurations = [];

    (Array.isArray(metricEventRows) ? metricEventRows : []).forEach((row) => {
      const eventType = String(row.event_type || "").trim();
      const occurredAt = toNullableNumber(row.occurred_at);
      const payload = safeParseJson(row.payload_json, {});

      if (eventType === "WEBSITE_DELETED") {
        const reasons = Array.isArray(payload?.reasons) ? payload.reasons : [];
        reasons.forEach((reason) => {
          const normalizedReason = String(reason || "").trim();
          if (!normalizedReason) {
            return;
          }

          deleteReasonCounts.set(normalizedReason, (deleteReasonCounts.get(normalizedReason) || 0) + 1);
        });
        return;
      }

      if (eventType === "WEBSITE_BUILD_STARTED") {
        const attemptId = parseAttemptId(payload);
        if (attemptId && Number.isFinite(occurredAt)) {
          const existingOccurredAt = startedAttempts.get(attemptId);
          if (!Number.isFinite(existingOccurredAt) || occurredAt < existingOccurredAt) {
            startedAttempts.set(attemptId, occurredAt);
          }
        }
        return;
      }

      if (eventType === "WEBSITE_PREVIEW_READY") {
        const durationMs = parseDurationMetric(payload);
        if (Number.isFinite(durationMs) && durationMs > 0) {
          previewReadyDurations.push(durationMs);
        }

        return;
      }

      if (eventType === "WEBSITE_BUILD_SUCCEEDED" || eventType === "WEBSITE_BUILD_FAILED") {
        const attemptId = parseAttemptId(payload);
        if (attemptId) {
          completedAttemptIds.add(attemptId);
        }
        return;
      }

      if (eventType === "SITE_LCP_RECORDED") {
        const surface = parseSurface(payload);
        const viewport = parseViewport(payload);
        const durationMs = parseDurationMetric(payload);

        if (viewport !== "mobile" || !Number.isFinite(durationMs) || durationMs <= 0) {
          return;
        }

        if (surface === "preview") {
          previewMobileLcpDurations.push(durationMs);
          return;
        }

        if (surface === "live") {
          liveMobileLcpDurations.push(durationMs);
        }
      }
    });

    const deletionReasonBreakdown = Array.from(deleteReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

    const previewMetrics = eventCounts.get("PUBLIC_PREVIEW_OPENED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const draftCreatedMetrics = eventCounts.get("WEBSITE_DRAFT_CREATED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const draftSavedMetrics = eventCounts.get("WEBSITE_DRAFT_SAVED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const livePreviewUpdateMetrics = eventCounts.get("LIVE_PREVIEW_UPDATED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const buildStartedMetrics = eventCounts.get("WEBSITE_BUILD_STARTED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const buildSucceededMetrics = eventCounts.get("WEBSITE_BUILD_SUCCEEDED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const buildFailedMetrics = eventCounts.get("WEBSITE_BUILD_FAILED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const deletedWebsiteMetrics = eventCounts.get("WEBSITE_DELETED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };
    const buildStartedCount = buildStartedMetrics.total;
    const buildSucceededCount = buildSucceededMetrics.total;
    const buildFailedCount = buildFailedMetrics.total;
    const buildAbandonedCount = Array.from(startedAttempts.entries()).filter(
      ([attemptId, occurredAt]) =>
        Number.isFinite(occurredAt) &&
        occurredAt <= Date.now() - BUILD_ABANDONMENT_WINDOW_MS &&
        !completedAttemptIds.has(attemptId)
    ).length;

    return {
      currentDraftCount: toCount(draftCountRows?.[0]?.total),
      draftCreatedCount: draftCreatedMetrics.total,
      draftSaveCount: draftSavedMetrics.total,
      buildStartedCount,
      buildSucceededCount,
      buildFailedCount,
      buildAbandonedCount,
      buildSuccessRate: toPercentage(buildSucceededCount, buildStartedCount),
      buildFailureRate: toPercentage(buildFailedCount, buildStartedCount),
      buildAbandonmentRate: toPercentage(buildAbandonedCount, buildStartedCount),
      timeToFirstPreviewP95: getPercentile(previewReadyDurations, 95),
      publicPreviewViewCount: previewMetrics.total,
      uniquePreviewedWebsiteCount: previewMetrics.uniqueDrafts,
      livePreviewUpdateCount: livePreviewUpdateMetrics.total,
      deletedWebsiteCount: deletedWebsiteMetrics.total,
      lastPublicPreviewAt: previewMetrics.lastOccurredAt,
      lastLivePreviewUpdateAt: livePreviewUpdateMetrics.lastOccurredAt,
      previewSiteLcpMobileP75: getPercentile(previewMobileLcpDurations, 75),
      liveSiteLcpMobileP75: getPercentile(liveMobileLcpDurations, 75),
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
