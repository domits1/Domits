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

    const [draftCountRows, eventCountRows, deleteEventRows] = await Promise.all([
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
        `SELECT payload_json
         FROM ${standaloneEventTable}
         ${eventWhereClause}
         ${hasHostScope ? "AND" : "WHERE"} event_type = 'WEBSITE_DELETED'`,
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
    (Array.isArray(deleteEventRows) ? deleteEventRows : []).forEach((row) => {
      const payload = safeParseJson(row.payload_json, {});
      const reasons = Array.isArray(payload?.reasons) ? payload.reasons : [];
      reasons.forEach((reason) => {
        const normalizedReason = String(reason || "").trim();
        if (!normalizedReason) {
          return;
        }

        deleteReasonCounts.set(normalizedReason, (deleteReasonCounts.get(normalizedReason) || 0) + 1);
      });
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
    const deletedWebsiteMetrics = eventCounts.get("WEBSITE_DELETED") || {
      total: 0,
      uniqueDrafts: 0,
      lastOccurredAt: null,
    };

    return {
      currentDraftCount: toCount(draftCountRows?.[0]?.total),
      draftCreatedCount: draftCreatedMetrics.total,
      draftSaveCount: draftSavedMetrics.total,
      publicPreviewViewCount: previewMetrics.total,
      uniquePreviewedWebsiteCount: previewMetrics.uniqueDrafts,
      livePreviewUpdateCount: livePreviewUpdateMetrics.total,
      deletedWebsiteCount: deletedWebsiteMetrics.total,
      lastPublicPreviewAt: previewMetrics.lastOccurredAt,
      lastLivePreviewUpdateAt: livePreviewUpdateMetrics.lastOccurredAt,
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
