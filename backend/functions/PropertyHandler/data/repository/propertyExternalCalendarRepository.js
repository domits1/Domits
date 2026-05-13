import Database from "database";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SELECT_COLUMNS_WITH_PROVIDER = `
  property_id AS "propertyId",
  source_id AS "sourceId",
  calendar_name AS "calendarName",
  calendar_url AS "calendarUrl",
  provider AS "provider",
  blocked_dates AS "blockedDates",
  last_sync_at AS "lastSyncAt",
  updated_at AS "updatedAt",
  etag AS "etag",
  last_modified AS "lastModified"
`;

const SELECT_COLUMNS_NO_PROVIDER = `
  property_id AS "propertyId",
  source_id AS "sourceId",
  calendar_name AS "calendarName",
  calendar_url AS "calendarUrl",
  blocked_dates AS "blockedDates",
  last_sync_at AS "lastSyncAt",
  updated_at AS "updatedAt",
  etag AS "etag",
  last_modified AS "lastModified"
`;

const normalizeOrder = (order) => (String(order || "").toUpperCase() === "ASC" ? "ASC" : "DESC");
const quoteIdentifier = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;
const isValidSchemaName = (value) =>
  typeof value === "string" && /^[A-Za-z_]\w*$/.test(value.trim());

const getSchemaName = (client) => {
  if (process.env.TEST === "true") {
    return "test";
  }

  const schema = client?.options?.schema;
  if (isValidSchemaName(schema)) {
    const normalized = schema.trim().toLowerCase();
    return normalized === "public" ? "main" : normalized;
  }

  return "main";
};

const getIcalSourceTableName = (client) => {
  const schemaName = getSchemaName(client);
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier("property_ical_source")}`;
};

const safeParseJson = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

const normalizeTimestamp = (value) => {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedDate = new Date(String(value));
  const parsedTimestamp = parsedDate.getTime();
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
};

const hasProviderColumn = async (client) => {
  try {
    const schemaName = getSchemaName(client);
    const rows = await client.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = $2
        AND table_schema = $3
      LIMIT 1
      `,
      ["property_ical_source", "provider", schemaName]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
};

const listSourcesByProperty = async (
  client,
  propertyId,
  { order = "DESC", tolerateMissingTable = false } = {}
) => {
  const providerColumnExists = await hasProviderColumn(client);
  const selectColumns = providerColumnExists ? SELECT_COLUMNS_WITH_PROVIDER : SELECT_COLUMNS_NO_PROVIDER;
  const sortOrder = normalizeOrder(order);
  const sourceTable = getIcalSourceTableName(client);

  try {
    const rows = await client.query(
      `
      SELECT
        ${selectColumns}
      FROM ${sourceTable}
      WHERE property_id = $1
      ORDER BY updated_at ${sortOrder}
      `,
      [propertyId]
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (tolerateMissingTable && error?.code === "42P01") {
      return [];
    }
    throw error;
  }
};

const buildBlockedDateKeys = (rows) => {
  const blockedDateKeys = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const blockedDates = safeParseJson(row?.blockedDates);
    (Array.isArray(blockedDates) ? blockedDates : []).forEach((dateKey) => {
      const normalizedKey = String(dateKey || "").trim();
      if (DATE_KEY_PATTERN.test(normalizedKey)) {
        blockedDateKeys.add(normalizedKey);
      }
    });
  });

  return Array.from(blockedDateKeys).sort((left, right) => left.localeCompare(right));
};

const mapCalendarSyncSource = (row) => ({
  propertyId: String(row?.propertyId || "").trim(),
  sourceId: String(row?.sourceId || "").trim(),
  calendarName: String(row?.calendarName || "").trim(),
  calendarUrl: String(row?.calendarUrl || "").trim(),
  provider: String(row?.provider || "").trim(),
  lastSyncAt: normalizeTimestamp(row?.lastSyncAt),
  updatedAt: normalizeTimestamp(row?.updatedAt),
});

const getLatestSyncTimestamp = (syncSources) => {
  let latestTimestamp = null;

  syncSources.forEach((source) => {
    const candidateTimestamp = source.lastSyncAt || source.updatedAt;
    if (!candidateTimestamp) {
      return;
    }

    if (latestTimestamp === null) {
      latestTimestamp = candidateTimestamp;
      return;
    }

    latestTimestamp = Math.max(latestTimestamp, candidateTimestamp);
  });

  return latestTimestamp;
};

export class PropertyExternalCalendarRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getAvailabilitySnapshotByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rows = await listSourcesByProperty(client, propertyId, {
      order: "DESC",
      tolerateMissingTable: true,
    });

    const blockedDateKeys = buildBlockedDateKeys(rows);
    const syncSources = (Array.isArray(rows) ? rows : []).map(mapCalendarSyncSource);
    const syncedSourceCount = syncSources.length;
    const lastSyncAt = getLatestSyncTimestamp(syncSources);

    return {
      externalBlockedDates: blockedDateKeys,
      hasExternalCalendarSync: syncedSourceCount > 0,
      syncedSourceCount,
      lastSyncAt,
      syncSources,
    };
  }

  async getBlockedDatesByPropertyId(propertyId) {
    const snapshot = await this.getAvailabilitySnapshotByPropertyId(propertyId);
    return snapshot.externalBlockedDates;
  }
}
