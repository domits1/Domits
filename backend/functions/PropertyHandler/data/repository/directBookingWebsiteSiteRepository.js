import Database from "database";
import { randomUUID } from "node:crypto";

const SITE_ALLOWED_STATUSES = new Set(["DRAFT", "PREVIEW", "PUBLISHED", "SUSPENDED"]);
const DEFAULT_SITE_LOCALE = "en";
const EMPTY_JSON_OBJECT = "{}";
const SITE_SELECT_COLUMNS = `id,
        property_id,
        host_id,
        site_name,
        primary_locale,
        status,
        template_key,
        published_property_snapshot_json,
        published_content_overrides_json,
        published_theme_overrides_json,
        preview_token_hash,
        published_at,
        suspended_at,
        created_at,
        updated_at`;

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

const siteTableName = (schemaName) => `${schemaName}.standalone_site`;
const buildSiteSelectQuery = (tableName, whereClause) =>
  `SELECT
        ${SITE_SELECT_COLUMNS}
      FROM ${tableName}
      ${whereClause}
      LIMIT 1`;

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

const normalizeJsonObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);
      if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
        return JSON.stringify(parsedValue);
      }
    } catch {
      return EMPTY_JSON_OBJECT;
    }
  }

  return EMPTY_JSON_OBJECT;
};

const normalizeSiteStatus = (status) => {
  const normalizedStatus = String(status || "DRAFT").trim().toUpperCase();
  if (!SITE_ALLOWED_STATUSES.has(normalizedStatus)) {
    throw new TypeError("website site status must be DRAFT, PREVIEW, PUBLISHED, or SUSPENDED.");
  }

  return normalizedStatus;
};

const normalizeLocale = (locale) => {
  const normalizedLocale = String(locale || "").trim().toLowerCase();
  return normalizedLocale || DEFAULT_SITE_LOCALE;
};

const mapSiteRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    hostId: String(row.host_id),
    siteName: String(row.site_name),
    primaryLocale: String(row.primary_locale),
    status: String(row.status),
    templateKey: String(row.template_key),
    publishedPropertySnapshot: safeParseJson(row.published_property_snapshot_json, {}),
    publishedContentOverrides: safeParseJson(row.published_content_overrides_json, {}),
    publishedThemeOverrides: safeParseJson(row.published_theme_overrides_json, {}),
    previewTokenHash: row.preview_token_hash ? String(row.preview_token_hash) : "",
    publishedAt: row.published_at === null || row.published_at === undefined ? null : Number(row.published_at),
    suspendedAt: row.suspended_at === null || row.suspended_at === undefined ? null : Number(row.suspended_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
};

export class DirectBookingWebsiteSiteRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async upsertSite({
    propertyId,
    hostId,
    siteName,
    primaryLocale = DEFAULT_SITE_LOCALE,
    status = "DRAFT",
    templateKey,
    publishedPropertySnapshot = {},
    publishedContentOverrides = {},
    publishedThemeOverrides = {},
    previewTokenHash = null,
    publishedAt = null,
    suspendedAt = null,
  }) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteTableName(schemaName);
    const now = Date.now();
    const normalizedStatus = normalizeSiteStatus(status);

    const rows = await client.query(
      `INSERT INTO ${tableName} (
        id,
        property_id,
        host_id,
        site_name,
        primary_locale,
        status,
        template_key,
        published_property_snapshot_json,
        published_content_overrides_json,
        published_theme_overrides_json,
        preview_token_hash,
        published_at,
        suspended_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (property_id)
      DO UPDATE SET
        host_id = EXCLUDED.host_id,
        site_name = EXCLUDED.site_name,
        primary_locale = EXCLUDED.primary_locale,
        status = EXCLUDED.status,
        template_key = EXCLUDED.template_key,
        published_property_snapshot_json = EXCLUDED.published_property_snapshot_json,
        published_content_overrides_json = EXCLUDED.published_content_overrides_json,
        published_theme_overrides_json = EXCLUDED.published_theme_overrides_json,
        preview_token_hash = EXCLUDED.preview_token_hash,
        published_at = EXCLUDED.published_at,
        suspended_at = EXCLUDED.suspended_at,
        updated_at = EXCLUDED.updated_at
      RETURNING
        id,
        property_id,
        host_id,
        site_name,
        primary_locale,
        status,
        template_key,
        published_property_snapshot_json,
        published_content_overrides_json,
        published_theme_overrides_json,
        preview_token_hash,
        published_at,
        suspended_at,
        created_at,
        updated_at`,
      [
        randomUUID(),
        propertyId,
        hostId,
        String(siteName || "").trim() || `website-${String(propertyId || "").slice(0, 8)}`,
        normalizeLocale(primaryLocale),
        normalizedStatus,
        String(templateKey || "").trim(),
        normalizeJsonObject(publishedPropertySnapshot),
        normalizeJsonObject(publishedContentOverrides),
        normalizeJsonObject(publishedThemeOverrides),
        previewTokenHash ? String(previewTokenHash).trim() : null,
        publishedAt === null || publishedAt === undefined ? null : Number(publishedAt),
        suspendedAt === null || suspendedAt === undefined ? null : Number(suspendedAt),
        now,
        now,
      ]
    );

    return mapSiteRow(rows?.[0] || null);
  }

  async getSiteByPropertyIdAndHostId(propertyId, hostId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteTableName(schemaName);

    const rows = await client.query(
      buildSiteSelectQuery(tableName, "WHERE property_id = $1 AND host_id = $2"),
      [propertyId, hostId]
    );

    return mapSiteRow(rows?.[0] || null);
  }

  async getSiteById(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteTableName(schemaName);

    const rows = await client.query(
      buildSiteSelectQuery(tableName, "WHERE id = $1"),
      [siteId]
    );

    return mapSiteRow(rows?.[0] || null);
  }

  async updateSiteStatus(siteId, status) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteTableName(schemaName);
    const normalizedStatus = normalizeSiteStatus(status);
    const now = Date.now();
    const suspendedAt = normalizedStatus === "SUSPENDED" ? now : null;

    const rows = await client.query(
      `UPDATE ${tableName}
      SET
        status = $2,
        suspended_at = $3,
        updated_at = $4
      WHERE id = $1
      RETURNING
        id,
        property_id,
        host_id,
        site_name,
        primary_locale,
        status,
        template_key,
        published_property_snapshot_json,
        published_content_overrides_json,
        published_theme_overrides_json,
        preview_token_hash,
        published_at,
        suspended_at,
        created_at,
        updated_at`,
      [siteId, normalizedStatus, suspendedAt, now]
    );

    return mapSiteRow(rows?.[0] || null);
  }
}
