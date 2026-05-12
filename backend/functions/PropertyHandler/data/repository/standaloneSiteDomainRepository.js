import Database from "database";
import { randomUUID } from "node:crypto";

const DOMAIN_ALLOWED_TYPES = new Set(["FALLBACK", "CUSTOM"]);
const DOMAIN_ALLOWED_STATUSES = new Set(["PENDING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED"]);
const SITE_DOMAIN_SELECT_COLUMNS = `id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
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

const siteDomainTableName = (schemaName) => `${schemaName}.standalone_site_domain`;
const buildSiteDomainSelectQuery = (tableName, whereClause, suffix = "") =>
  `SELECT
        ${SITE_DOMAIN_SELECT_COLUMNS}
      FROM ${tableName}
      ${whereClause}
      ${suffix}`.trim();

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

const normalizeDomainType = (domainType) => {
  const normalizedDomainType = String(domainType || "").trim().toUpperCase();
  if (!DOMAIN_ALLOWED_TYPES.has(normalizedDomainType)) {
    throw new TypeError("website domain type must be FALLBACK or CUSTOM.");
  }

  return normalizedDomainType;
};

const normalizeDomainStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  if (!DOMAIN_ALLOWED_STATUSES.has(normalizedStatus)) {
    throw new TypeError("website domain status must be PENDING, VERIFIED, ACTIVE, FAILED, or DISABLED.");
  }

  return normalizedStatus;
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
      return "{}";
    }
  }

  return "{}";
};

const normalizeOptionalBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
};

const mapSiteDomainRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    siteId: String(row.site_id),
    domain: String(row.domain),
    domainType: String(row.domain_type),
    status: String(row.status),
    isPrimary: Boolean(row.is_primary),
    verificationDetails: safeParseJson(row.verification_details_json, {}),
    lastCheckedAt:
      row.last_checked_at === null || row.last_checked_at === undefined ? null : Number(row.last_checked_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
};

export class StandaloneSiteDomainRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async listDomainsBySiteId(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const rows = await client.query(
      `SELECT
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at
      FROM ${tableName}
      WHERE site_id = $1
      ORDER BY is_primary DESC, created_at ASC`,
      [siteId]
    );

    return (Array.isArray(rows) ? rows : []).map(mapSiteDomainRow).filter(Boolean);
  }

  async getFallbackDomainBySiteId(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const rows = await client.query(
      buildSiteDomainSelectQuery(tableName, "WHERE site_id = $1 AND domain_type = 'FALLBACK'", "LIMIT 1"),
      [siteId]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async getPrimaryLiveDomainBySiteId(siteId) {
    return this.getFallbackDomainBySiteId(siteId);
  }

  async getCustomDomainBySiteId(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const rows = await client.query(
      buildSiteDomainSelectQuery(
        tableName,
        "WHERE site_id = $1 AND domain_type = 'CUSTOM'",
        "ORDER BY created_at DESC LIMIT 1"
      ),
      [siteId]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async getDomainByName(domain) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const rows = await client.query(
      buildSiteDomainSelectQuery(tableName, "WHERE domain = $1", "LIMIT 1"),
      [String(domain || "").trim().toLowerCase()]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async ensureDomain({
    siteId,
    domain,
    domainType,
    status,
    isPrimary = true,
    verificationDetails = {},
    lastCheckedAt = Date.now(),
  }) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const now = Date.now();
    const normalizedDomainType = normalizeDomainType(domainType);
    const normalizedStatus = normalizeDomainStatus(status);
    const normalizedDomain = String(domain || "").trim().toLowerCase();

    const rows = await client.query(
      `INSERT INTO ${tableName} (
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (domain)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        domain_type = EXCLUDED.domain_type,
        status = EXCLUDED.status,
        is_primary = EXCLUDED.is_primary,
        verification_details_json = EXCLUDED.verification_details_json,
        last_checked_at = EXCLUDED.last_checked_at,
        updated_at = EXCLUDED.updated_at
      RETURNING
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at`,
      [
        randomUUID(),
        siteId,
        normalizedDomain,
        normalizedDomainType,
        normalizedStatus,
        Boolean(isPrimary),
        normalizeJsonObject(verificationDetails),
        lastCheckedAt === null || lastCheckedAt === undefined ? null : Number(lastCheckedAt),
        now,
        now,
      ]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async updateFallbackDomainStatus(siteId, status, verificationDetails = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const normalizedStatus = normalizeDomainStatus(status);
    const now = Date.now();

    const rows = await client.query(
      `UPDATE ${tableName}
      SET
        status = $2,
        verification_details_json = $3,
        last_checked_at = $4,
        updated_at = $4
      WHERE site_id = $1 AND domain_type = 'FALLBACK'
      RETURNING
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at`,
      [siteId, normalizedStatus, normalizeJsonObject(verificationDetails), now]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async updatePrimaryLiveDomainStatus(siteId, status, verificationDetails = {}) {
    return this.updateFallbackDomainStatus(siteId, status, verificationDetails);
  }

  async upsertCustomDomainForSite({
    siteId,
    domain,
    status,
    isPrimary = false,
    verificationDetails = {},
    lastCheckedAt = Date.now(),
  }) {
    const existingCustomDomain = await this.getCustomDomainBySiteId(siteId);
    if (!existingCustomDomain) {
      return this.ensureDomain({
        siteId,
        domain,
        domainType: "CUSTOM",
        status,
        isPrimary,
        verificationDetails,
        lastCheckedAt,
      });
    }

    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const normalizedDomain = String(domain || "").trim().toLowerCase();
    const normalizedStatus = normalizeDomainStatus(status);
    const now = Date.now();

    const rows = await client.query(
      `UPDATE ${tableName}
      SET
        domain = $2,
        status = $3,
        is_primary = $4,
        verification_details_json = $5,
        last_checked_at = $6,
        updated_at = $6
      WHERE id = $1
      RETURNING
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at`,
      [
        existingCustomDomain.id,
        normalizedDomain,
        normalizedStatus,
        Boolean(isPrimary),
        normalizeJsonObject(verificationDetails),
        lastCheckedAt === null || lastCheckedAt === undefined ? now : Number(lastCheckedAt),
      ]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async updateDomainById(domainId, { status, isPrimary, verificationDetails, lastCheckedAt = Date.now() } = {}) {
    const normalizedDomainId = String(domainId || "").trim();
    if (!normalizedDomainId) {
      throw new TypeError("website domain id is required.");
    }

    const nextStatus = status === undefined ? undefined : normalizeDomainStatus(status);
    const nextIsPrimary = normalizeOptionalBoolean(isPrimary);
    const hasVerificationDetails = verificationDetails !== undefined;
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const now = lastCheckedAt === null || lastCheckedAt === undefined ? Date.now() : Number(lastCheckedAt);
    const updateAssignments = ["last_checked_at = $2", "updated_at = $2"];
    const params = [normalizedDomainId, now];
    let nextParamIndex = params.length + 1;

    if (nextStatus !== undefined) {
      updateAssignments.push(`status = $${nextParamIndex}`);
      params.push(nextStatus);
      nextParamIndex += 1;
    }

    if (nextIsPrimary !== undefined) {
      updateAssignments.push(`is_primary = $${nextParamIndex}`);
      params.push(nextIsPrimary);
      nextParamIndex += 1;
    }

    if (hasVerificationDetails) {
      updateAssignments.push(`verification_details_json = $${nextParamIndex}`);
      params.push(normalizeJsonObject(verificationDetails));
      nextParamIndex += 1;
    }

    const rows = await client.query(
      `UPDATE ${tableName}
      SET
        ${updateAssignments.join(",\n        ")}
      WHERE id = $1
      RETURNING
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at`,
      params
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async setOnlyPrimaryDomain(siteId, primaryDomainId) {
    const normalizedSiteId = String(siteId || "").trim();
    const normalizedPrimaryDomainId = String(primaryDomainId || "").trim();
    if (!normalizedSiteId || !normalizedPrimaryDomainId) {
      throw new TypeError("website siteId and primaryDomainId are required.");
    }

    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const now = Date.now();

    await client.query(
      `UPDATE ${tableName}
      SET
        is_primary = CASE WHEN id = $2 THEN TRUE ELSE FALSE END,
        updated_at = $3
      WHERE site_id = $1`,
      [normalizedSiteId, normalizedPrimaryDomainId, now]
    );
  }

  async disableCustomDomainBySiteId(siteId, verificationDetails = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const now = Date.now();

    const rows = await client.query(
      `UPDATE ${tableName}
      SET
        status = 'DISABLED',
        is_primary = false,
        verification_details_json = $2,
        last_checked_at = $3,
        updated_at = $3
      WHERE site_id = $1 AND domain_type = 'CUSTOM'
      RETURNING
        id,
        site_id,
        domain,
        domain_type,
        status,
        is_primary,
        verification_details_json,
        last_checked_at,
        created_at,
        updated_at`,
      [siteId, normalizeJsonObject(verificationDetails), now]
    );

    return mapSiteDomainRow(rows?.[0] || null);
  }

  async verifyCustomDomainBySiteId(siteId, verificationDetails = {}) {
    const existingCustomDomain = await this.getCustomDomainBySiteId(siteId);
    if (!existingCustomDomain) {
      return null;
    }

    return this.updateDomainById(existingCustomDomain.id, {
      status: "VERIFIED",
      isPrimary: false,
      verificationDetails,
    });
  }

  async activateCustomDomainBySiteId(siteId, verificationDetails = {}) {
    const customDomain = await this.getCustomDomainBySiteId(siteId);
    if (!customDomain) {
      return null;
    }

    const activeCustomDomain = await this.updateDomainById(customDomain.id, {
      status: "ACTIVE",
      isPrimary: true,
      verificationDetails,
    });
    await this.setOnlyPrimaryDomain(siteId, customDomain.id);

    return activeCustomDomain;
  }

  async deactivateCustomDomainBySiteId(siteId, verificationDetails = {}) {
    const customDomain = await this.getCustomDomainBySiteId(siteId);
    const fallbackDomain = await this.getFallbackDomainBySiteId(siteId);
    if (!customDomain || !fallbackDomain) {
      return null;
    }

    const nextCustomDomain = await this.updateDomainById(customDomain.id, {
      status: "VERIFIED",
      isPrimary: false,
      verificationDetails,
    });
    await this.updateDomainById(fallbackDomain.id, {
      isPrimary: true,
      verificationDetails: fallbackDomain.verificationDetails,
    });
    await this.setOnlyPrimaryDomain(siteId, fallbackDomain.id);

    return nextCustomDomain;
  }
}
