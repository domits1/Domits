import Database from "database";

const STATIC_PAGE_STATUS_BUILDING = "BUILDING";
const STATIC_PAGE_STATUS_ACTIVE = "ACTIVE";
const STATIC_PAGE_STATUS_FAILED = "FAILED";
const STATIC_PAGE_STATUS_SKIPPED = "SKIPPED";
export const STATIC_PAGE_BUILD_LEASE_MS = 15 * 60 * 1000;
export const STATIC_PAGE_RETRY_DELAY_MS = 10 * 60 * 1000;
export const STATIC_PAGE_ATTEMPT_LIMIT = 5;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
const TRANSIENT_CONFLICT_CODES = new Set(["40001", "OC001"]);
const OUTBOX_SELECT_COLUMNS = `site_id,
        property_id,
        host_id,
        revision,
        status,
        attempt_count,
        failure_reason,
        created_at,
        updated_at,
        processed_at`;

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

const outboxTableName = (schemaName) => `${schemaName}.static_page_outbox`;

const runStatement = async (client, statement, parameters) => {
  const queryRunner = client.createQueryRunner();
  try {
    const result = await queryRunner.query(statement, parameters, true);
    return {
      records: Array.isArray(result?.records) ? result.records : [],
      affected: Number(result?.affected) || 0,
    };
  } finally {
    await queryRunner.release();
  }
};

const isTransientTransactionConflict = (error) =>
  TRANSIENT_CONFLICT_CODES.has(String(error?.code || error?.driverError?.code || ""));

const requireSiteId = (siteId) => {
  const normalized = String(siteId || "").trim();
  if (!normalized) {
    throw new Error("A site id is required.");
  }

  return normalized;
};

const requireRevision = (revision) => {
  const normalized = Number(revision);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error("A static page revision must be a positive integer.");
  }

  return normalized;
};

const normalizeLimit = (limit) => {
  const normalized = Number(limit);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    return DEFAULT_PAGE_LIMIT;
  }

  return Math.min(normalized, MAX_PAGE_LIMIT);
};

const mapOutboxRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    siteId: String(row.site_id),
    propertyId: String(row.property_id),
    hostId: String(row.host_id),
    revision: Number(row.revision),
    status: String(row.status),
    attemptCount: Number(row.attempt_count ?? 0),
    failureReason: row.failure_reason ? String(row.failure_reason) : "",
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    processedAt: row.processed_at === null || row.processed_at === undefined ? null : Number(row.processed_at),
  };
};

export class StaticPageOutboxRepository {
  async listPagesToBuild({ limit = DEFAULT_PAGE_LIMIT, now = Date.now() } = {}) {
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const rows = await client.query(
      `SELECT
        ${OUTBOX_SELECT_COLUMNS}
      FROM ${tableName}
      WHERE (status = 'PENDING'
        OR (status = 'FAILED' AND updated_at < $1)
        OR (status = 'BUILDING' AND updated_at < $2))
        AND attempt_count < $3
      ORDER BY updated_at ASC
      LIMIT $4`,
      [
        now - STATIC_PAGE_RETRY_DELAY_MS,
        now - STATIC_PAGE_BUILD_LEASE_MS,
        STATIC_PAGE_ATTEMPT_LIMIT,
        normalizeLimit(limit),
      ]
    );

    return (Array.isArray(rows) ? rows : []).map(mapOutboxRow).filter(Boolean);
  }

  async claimPage(siteId, revision, { now = Date.now() } = {}) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));
    const retryBefore = now - STATIC_PAGE_RETRY_DELAY_MS;
    const staleBefore = now - STATIC_PAGE_BUILD_LEASE_MS;

    try {
      const { records } = await runStatement(
        client,
        `UPDATE ${tableName}
      SET status = 'BUILDING',
          attempt_count = attempt_count + 1,
          updated_at = $3
      WHERE site_id = $1
        AND revision = $2
        AND (status = 'PENDING'
          OR (status = 'FAILED' AND updated_at < $4)
          OR (status = 'BUILDING' AND updated_at < $5))
        AND attempt_count < $6
      RETURNING site_id`,
        [normalizedSiteId, normalizedRevision, now, retryBefore, staleBefore, STATIC_PAGE_ATTEMPT_LIMIT]
      );

      return records.length > 0;
    } catch (error) {
      if (isTransientTransactionConflict(error)) {
        return false;
      }
      throw error;
    }
  }

  async markPageActive(siteId, revision, { now = Date.now() } = {}) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);

    const { records } = await runStatement(
      client,
      `UPDATE ${outboxTableName(schemaName)}
      SET status = $3,
          failure_reason = NULL,
          processed_at = $4,
          updated_at = $4
      WHERE site_id = $1
        AND revision = $2
        AND status = 'BUILDING'
        AND EXISTS (
          SELECT 1
          FROM ${schemaName}.standalone_site AS site
          WHERE site.id = $5
            AND site.status = 'PUBLISHED'
            AND site.static_page_revision = $2
        )
      RETURNING site_id`,
      [normalizedSiteId, normalizedRevision, STATIC_PAGE_STATUS_ACTIVE, now, normalizedSiteId]
    );

    return records.length > 0;
  }

  async markPageFailed(siteId, revision, failureReason, { now = Date.now() } = {}) {
    return this.#finishBuild(siteId, revision, STATIC_PAGE_STATUS_FAILED, failureReason, null, now);
  }

  async skipPage(siteId, revision, reason, { now = Date.now() } = {}) {
    return this.#finishBuild(siteId, revision, STATIC_PAGE_STATUS_SKIPPED, reason, now, now);
  }

  async requeueNewerRevision(siteId, revision, { now = Date.now() } = {}) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET status = 'PENDING',
          updated_at = $4
      WHERE site_id = $1
        AND revision > $2
        AND status = ANY($3)
      RETURNING site_id`,
      [normalizedSiteId, normalizedRevision, [STATIC_PAGE_STATUS_BUILDING, STATIC_PAGE_STATUS_ACTIVE], now]
    );

    return records.length > 0;
  }

  async #finishBuild(siteId, revision, status, failureReason, processedAt, now) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET status = $3,
          failure_reason = $4,
          processed_at = COALESCE($6, processed_at),
          updated_at = $5
      WHERE site_id = $1
        AND revision = $2
        AND status = 'BUILDING'
      RETURNING site_id`,
      [normalizedSiteId, normalizedRevision, status, String(failureReason || "").slice(0, 500), now, processedAt]
    );

    return records.length > 0;
  }
}

export default StaticPageOutboxRepository;
