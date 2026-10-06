import Database from "database";

const STATIC_PAGE_STATUS_PENDING = "PENDING";
const STATIC_PAGE_STATUS_ACTIVE = "ACTIVE";
const STATIC_PAGE_STATUS_FAILED = "FAILED";
const STATIC_PAGE_STATUSES_TO_BUILD = [STATIC_PAGE_STATUS_PENDING, STATIC_PAGE_STATUS_FAILED];
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
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
  async listPagesToBuild({ limit = DEFAULT_PAGE_LIMIT } = {}) {
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const rows = await client.query(
      `SELECT
        ${OUTBOX_SELECT_COLUMNS}
      FROM ${tableName}
      WHERE status = ANY($1)
      ORDER BY updated_at ASC
      LIMIT $2`,
      [[...STATIC_PAGE_STATUSES_TO_BUILD], normalizeLimit(limit)]
    );

    return (Array.isArray(rows) ? rows : []).map(mapOutboxRow).filter(Boolean);
  }

  async markPageActive(siteId, revision, { now = Date.now() } = {}) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET status = $3,
          failure_reason = NULL,
          processed_at = $4,
          updated_at = $4
      WHERE site_id = $1
        AND revision = $2
      RETURNING site_id`,
      [normalizedSiteId, normalizedRevision, STATIC_PAGE_STATUS_ACTIVE, now]
    );

    return records.length > 0;
  }

  async markPageFailed(siteId, revision, failureReason, { now = Date.now() } = {}) {
    const normalizedSiteId = requireSiteId(siteId);
    const normalizedRevision = requireRevision(revision);
    const client = await Database.getInstance();
    const tableName = outboxTableName(resolveSchemaName(client));

    const { records } = await runStatement(
      client,
      `UPDATE ${tableName}
      SET status = $3,
          failure_reason = $4,
          attempt_count = attempt_count + 1,
          updated_at = $5
      WHERE site_id = $1
        AND revision = $2
      RETURNING site_id`,
      [normalizedSiteId, normalizedRevision, STATIC_PAGE_STATUS_FAILED, String(failureReason || "").slice(0, 500), now]
    );

    return records.length > 0;
  }
}

export default StaticPageOutboxRepository;
