import Database from "database";
import { randomUUID } from "node:crypto";

const FALLBACK_CONTENT_OVERRIDES = "{}";
const FALLBACK_THEME_OVERRIDES = "{}";
const ALLOWED_STATUSES = new Set(["DRAFT", "PREVIEW", "PUBLISHED", "SUSPENDED"]);

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

const draftTableName = (schemaName) => `${schemaName}.standalone_site_draft`;
const propertyTableName = (schemaName) => `${schemaName}.property`;
const propertyLocationTableName = (schemaName) => `${schemaName}.property_location`;

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

const normalizeStatus = (status) => {
  const normalized = String(status || "DRAFT").trim().toUpperCase();
  return ALLOWED_STATUSES.has(normalized) ? normalized : "DRAFT";
};

const normalizeOverrides = (value, fallbackJson) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch {
      return fallbackJson;
    }
  }

  return fallbackJson;
};

const mapDraftRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    hostId: String(row.host_id),
    templateKey: String(row.template_key),
    status: String(row.status),
    contentOverrides: safeParseJson(row.content_overrides_json, {}),
    themeOverrides: safeParseJson(row.theme_overrides_json, {}),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    lastPreviewBuiltAt:
      row.last_preview_built_at === null || row.last_preview_built_at === undefined
        ? null
        : Number(row.last_preview_built_at),
  };
};

const mapDraftListRow = (row) => {
  const mappedDraft = mapDraftRow(row);
  if (!mappedDraft) {
    return null;
  }

  return {
    ...mappedDraft,
    propertyTitle: typeof row.property_title === "string" ? row.property_title : "",
    propertySubtitle: typeof row.property_subtitle === "string" ? row.property_subtitle : "",
    propertyStatus: typeof row.property_status === "string" ? row.property_status : "",
    location: [row.location_city, row.location_country].filter(Boolean).join(", "),
  };
};

export class StandaloneSiteDraftRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async upsertDraft({
    hostId,
    propertyId,
    templateKey,
    status = "DRAFT",
    contentOverrides = {},
    themeOverrides = {},
  }) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = draftTableName(schemaName);
    const now = Date.now();
    const normalizedStatus = normalizeStatus(status);
    const normalizedContentOverrides = normalizeOverrides(contentOverrides, FALLBACK_CONTENT_OVERRIDES);
    const normalizedThemeOverrides = normalizeOverrides(themeOverrides, FALLBACK_THEME_OVERRIDES);

    const rows = await client.query(
      `INSERT INTO ${tableName} (
        id,
        property_id,
        host_id,
        template_key,
        status,
        content_overrides_json,
        theme_overrides_json,
        created_at,
        updated_at,
        last_preview_built_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (property_id)
      DO UPDATE SET
        host_id = EXCLUDED.host_id,
        template_key = EXCLUDED.template_key,
        status = EXCLUDED.status,
        content_overrides_json = EXCLUDED.content_overrides_json,
        theme_overrides_json = EXCLUDED.theme_overrides_json,
        updated_at = EXCLUDED.updated_at,
        last_preview_built_at = EXCLUDED.last_preview_built_at
      RETURNING
        id,
        property_id,
        host_id,
        template_key,
        status,
        content_overrides_json,
        theme_overrides_json,
        created_at,
        updated_at,
        last_preview_built_at`,
      [
        randomUUID(),
        propertyId,
        hostId,
        templateKey,
        normalizedStatus,
        normalizedContentOverrides,
        normalizedThemeOverrides,
        now,
        now,
        now,
      ]
    );

    return mapDraftRow(rows?.[0] || null);
  }

  async listDraftsByHostId(hostId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = draftTableName(schemaName);
    const propertyTable = propertyTableName(schemaName);
    const propertyLocationTable = propertyLocationTableName(schemaName);

    const rows = await client.query(
      `SELECT
        draft.id,
        draft.property_id,
        draft.host_id,
        draft.template_key,
        draft.status,
        draft.content_overrides_json,
        draft.theme_overrides_json,
        draft.created_at,
        draft.updated_at,
        draft.last_preview_built_at,
        property.title AS property_title,
        property.subtitle AS property_subtitle,
        property.status AS property_status,
        location.city AS location_city,
        location.country AS location_country
      FROM ${tableName} draft
      LEFT JOIN ${propertyTable} property ON property.id = draft.property_id
      LEFT JOIN ${propertyLocationTable} location ON location.property_id = draft.property_id
      WHERE draft.host_id = $1
      ORDER BY draft.updated_at DESC`,
      [hostId]
    );

    return (Array.isArray(rows) ? rows : []).map(mapDraftListRow).filter(Boolean);
  }

  async getDraftByPropertyIdAndHostId(propertyId, hostId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = draftTableName(schemaName);

    const rows = await client.query(
      `SELECT
        id,
        property_id,
        host_id,
        template_key,
        status,
        content_overrides_json,
        theme_overrides_json,
        created_at,
        updated_at,
        last_preview_built_at
      FROM ${tableName}
      WHERE property_id = $1 AND host_id = $2
      LIMIT 1`,
      [propertyId, hostId]
    );

    return mapDraftRow(rows?.[0] || null);
  }

  async deleteDraftByPropertyIdAndHostId(propertyId, hostId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = draftTableName(schemaName);

    await client.query(
      `DELETE FROM ${tableName}
      WHERE property_id = $1 AND host_id = $2`,
      [propertyId, hostId]
    );
  }
}
