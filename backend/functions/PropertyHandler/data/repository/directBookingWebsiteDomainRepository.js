import Database from "database";
import { randomUUID } from "node:crypto";

const DOMAIN_ALLOWED_TYPES = new Set(["FALLBACK", "CUSTOM"]);
const DOMAIN_ALLOWED_STATUSES = new Set(["PENDING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED", "REMOVING"]);
const DOMAIN_TYPE_CUSTOM = "CUSTOM";
const TRANSIENT_CONFLICT_CODES = new Set(["40001", "OC001"]);
const TRANSACTION_ATTEMPT_LIMIT = 2;
const CLAIM_ATTEMPT_LIMIT = 2;
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
const buildUpdateDomainStatusStatement = (tableName) =>
  `UPDATE ${tableName}
      SET
        status = $3,
        verification_details_json = $4,
        last_checked_at = $5,
        updated_at = $5
      WHERE id = $1 AND site_id = $2
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`;
const buildRestoreFallbackStatement = (tableName) =>
  `UPDATE ${tableName}
      SET
        is_primary = (domain_type = 'FALLBACK'),
        updated_at = $2
      WHERE site_id = $1
        AND is_primary IS DISTINCT FROM (domain_type = 'FALLBACK')
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`;
const buildDeleteDomainStatement = (tableName) =>
  `DELETE FROM ${tableName}
      WHERE id = $1 AND site_id = $2
      RETURNING id`;
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
    throw new TypeError("website domain status must be PENDING, VERIFIED, ACTIVE, FAILED, DISABLED, or REMOVING.");
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

const normalizeTimestamp = (value) => (value == null ? null : Number(value));

const toStructuredResult = (result) => ({
  records: Array.isArray(result?.records) ? result.records : [],
  affected: Number(result?.affected) || 0,
});

const runStatementOnRunner = async (queryRunner, statement, parameters) =>
  toStructuredResult(await queryRunner.query(statement, parameters, true));

const runStatement = async (client, statement, parameters) => {
  const queryRunner = client.createQueryRunner();
  try {
    return await runStatementOnRunner(queryRunner, statement, parameters);
  } finally {
    await queryRunner.release();
  }
};

const isTransientTransactionConflict = (error) =>
  TRANSIENT_CONFLICT_CODES.has(String(error?.code || error?.driverError?.code || ""));

const rollbackReportingFailure = async (queryRunner) => {
  try {
    await queryRunner.rollbackTransaction();
    return null;
  } catch (error) {
    console.error("[CustomDomain] rolling back a domain transaction failed; discarding the connection.", error);
    return error;
  }
};

const releaseQueryRunner = async (queryRunner, discardError) => {
  if (discardError && typeof queryRunner.releasePostgresConnection === "function") {
    await queryRunner.releasePostgresConnection(discardError);
    return;
  }

  await queryRunner.release();
};

const runInTransaction = async (client, work) => {
  let lastError = null;

  for (let attempt = 0; attempt < TRANSACTION_ATTEMPT_LIMIT; attempt += 1) {
    const queryRunner = client.createQueryRunner();
    let discardError = null;
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        discardError = await rollbackReportingFailure(queryRunner);
      }
      if (!isTransientTransactionConflict(error)) {
        throw error;
      }
      lastError = error;
    } finally {
      await releaseQueryRunner(queryRunner, discardError);
    }
  }

  throw lastError;
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
    lastCheckedAt: normalizeTimestamp(row.last_checked_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
};

export class DirectBookingWebsiteDomainRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async deleteDomainById(domainId, siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const { affected } = await runStatement(client, buildDeleteDomainStatement(tableName), [domainId, siteId]);

    return affected > 0;
  }

  async deleteDomainAndRestoreFallbackById(domainId, siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    return runInTransaction(client, async (queryRunner) => {
      const { affected } = await runStatementOnRunner(queryRunner, buildDeleteDomainStatement(tableName), [
        domainId,
        siteId,
      ]);
      if (affected <= 0) {
        return { deleted: false, changedRecords: [] };
      }

      const { records } = await runStatementOnRunner(queryRunner, buildRestoreFallbackStatement(tableName), [
        siteId,
        Date.now(),
      ]);

      return { deleted: true, changedRecords: records.map(mapSiteDomainRow).filter(Boolean) };
    });
  }

  async deleteDomainsBySiteId(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    await client.query(
      `DELETE FROM ${tableName}
      WHERE site_id = $1`,
      [siteId]
    );
  }

  async countDomainsByTenantId(tenantId) {
    const normalizedTenantId = String(tenantId || "").trim();
    if (!normalizedTenantId) {
      throw new TypeError("tenantId is required.");
    }
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const rows = await client.query(
      `SELECT COUNT(*)::int AS domain_count
      FROM ${tableName}
      WHERE POSITION($1 IN verification_details_json) > 0`,
      [`"tenantId":"${normalizedTenantId}"`]
    );

    return Number(rows?.[0]?.domain_count) || 0;
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
      buildSiteDomainSelectQuery(tableName, "WHERE site_id = $1 AND domain_type = 'CUSTOM'", "LIMIT 1"),
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

  async claimCustomDomain({ siteId, domain, status, verificationDetails = {}, lastCheckedAt = Date.now() }) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const normalizedStatus = normalizeDomainStatus(status);
    const normalizedDomain = String(domain || "").trim().toLowerCase();
    const normalizedDetails = normalizeJsonObject(verificationDetails);
    const checkedAt = normalizeTimestamp(lastCheckedAt);

    for (let attempt = 0; attempt < CLAIM_ATTEMPT_LIMIT; attempt += 1) {
      const now = Date.now();
      const { records } = await runStatement(
        client,
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
      ON CONFLICT (domain) DO NOTHING
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`,
        [
          randomUUID(),
          siteId,
          normalizedDomain,
          DOMAIN_TYPE_CUSTOM,
          normalizedStatus,
          false,
          normalizedDetails,
          checkedAt,
          now,
          now,
        ]
      );

      const insertedRecord = mapSiteDomainRow(records?.[0] || null);
      if (insertedRecord) {
        return { record: insertedRecord, created: true };
      }

      const storedRecord = await this.getDomainByName(normalizedDomain);
      if (storedRecord) {
        return { record: storedRecord, created: false };
      }
    }

    return { record: null, created: false };
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
      `INSERT INTO ${tableName} AS existing (
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
        domain_type = EXCLUDED.domain_type,
        status = EXCLUDED.status,
        is_primary = existing.is_primary,
        verification_details_json = EXCLUDED.verification_details_json,
        last_checked_at = EXCLUDED.last_checked_at,
        updated_at = EXCLUDED.updated_at
      WHERE existing.site_id = EXCLUDED.site_id
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
        normalizeTimestamp(lastCheckedAt),
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

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET
        status = $2,
        verification_details_json = $3,
        last_checked_at = $4,
        updated_at = $4
      WHERE site_id = $1 AND domain_type = 'FALLBACK'
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`,
      [siteId, normalizedStatus, normalizeJsonObject(verificationDetails), now]
    );

    return mapSiteDomainRow(records[0] || null);
  }

  async updatePrimaryLiveDomainStatus(siteId, status, verificationDetails = {}) {
    return this.updateFallbackDomainStatus(siteId, status, verificationDetails);
  }

  async promoteDomainToPrimary(siteId, domainId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET
        is_primary = (id = $2),
        updated_at = $3
      WHERE site_id = $1
        AND is_primary IS DISTINCT FROM (id = $2)
        AND EXISTS (
          SELECT 1
          FROM ${tableName} candidate
          WHERE candidate.id = $2
            AND candidate.site_id = $1
            AND candidate.domain_type = 'CUSTOM'
            AND candidate.status = 'ACTIVE'
        )
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`,
      [siteId, domainId, Date.now()]
    );

    return records.map(mapSiteDomainRow).filter(Boolean);
  }

  async restoreFallbackDomainAsPrimary(siteId) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);

    const { records } = await runStatement(client, buildRestoreFallbackStatement(tableName), [siteId, Date.now()]);

    return records.map(mapSiteDomainRow).filter(Boolean);
  }

  async updateDomainStatusAndRestoreFallbackById(domainId, siteId, status, verificationDetails = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const normalizedStatus = normalizeDomainStatus(status);
    const normalizedDetails = normalizeJsonObject(verificationDetails);

    return runInTransaction(client, async (queryRunner) => {
      const now = Date.now();
      const updateResult = await runStatementOnRunner(queryRunner, buildUpdateDomainStatusStatement(tableName), [
        domainId,
        siteId,
        normalizedStatus,
        normalizedDetails,
        now,
      ]);
      const record = mapSiteDomainRow(updateResult.records?.[0] || null);
      if (!record) {
        return { record: null, changedRecords: [] };
      }

      const { records } = await runStatementOnRunner(queryRunner, buildRestoreFallbackStatement(tableName), [
        siteId,
        now,
      ]);

      return { record, changedRecords: records.map(mapSiteDomainRow).filter(Boolean) };
    });
  }

  async updateDomainStatusById(domainId, siteId, status, verificationDetails = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const normalizedStatus = normalizeDomainStatus(status);
    const now = Date.now();

    const { records } = await runStatement(
      client,
      buildUpdateDomainStatusStatement(tableName),
      [domainId, siteId, normalizedStatus, normalizeJsonObject(verificationDetails), now]
    );

    return mapSiteDomainRow(records[0] || null);
  }

  async updateDomainVerificationDetailsById(domainId, siteId, verificationDetails = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const tableName = siteDomainTableName(schemaName);
    const now = Date.now();

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET
        verification_details_json = $3,
        last_checked_at = $4,
        updated_at = $4
      WHERE id = $1 AND site_id = $2
      RETURNING
        ${SITE_DOMAIN_SELECT_COLUMNS}`,
      [domainId, siteId, normalizeJsonObject(verificationDetails), now]
    );

    return mapSiteDomainRow(records[0] || null);
  }
}
