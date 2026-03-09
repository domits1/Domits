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
    if (normalized === "public") {
      return "main";
    }
    return normalized;
  }

  return "main";
};

const getIcalSourceTableName = (client) => {
  const schemaName = getSchemaName(client);
  if (!schemaName) {
    return "property_ical_source";
  }
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier("property_ical_source")}`;
};

export async function hasProviderColumn(client) {
  try {
    const schemaName = getSchemaName(client);
    const params = ["property_ical_source", "provider"];
    const schemaClause = schemaName
      ? `AND table_schema = $3`
      : `AND table_schema = ANY(current_schemas(true))`;
    if (schemaName) {
      params.push(schemaName);
    }
    const rows = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = $2
        ${schemaClause}
      LIMIT 1
    `, params);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function listSourcesByProperty(client, propertyId, { order = "DESC", tolerateMissingTable = false } = {}) {
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
}

export async function listSourcesWithLimit(client, limit, { order = "ASC", tolerateMissingTable = false } = {}) {
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 250;
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
      ORDER BY updated_at ${sortOrder}
      LIMIT $1
      `,
      [normalizedLimit]
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (tolerateMissingTable && error?.code === "42P01") {
      return [];
    }
    throw error;
  }
}

export async function upsertSourceRecord(
  client,
  { propertyId, sourceId, calendarName, calendarUrl, provider, blockedDatesText, lastSyncAt, etag, lastModified }
) {
  const providerColumnExists = await hasProviderColumn(client);
  const sourceTable = getIcalSourceTableName(client);
  await client.query(
    providerColumnExists
      ? `
        INSERT INTO ${sourceTable}
          (property_id, source_id, calendar_name, calendar_url, provider, blocked_dates, last_sync_at, updated_at, etag, last_modified)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7, now(), $8, $9)
        ON CONFLICT (property_id, source_id)
        DO UPDATE SET
          calendar_name = EXCLUDED.calendar_name,
          calendar_url = EXCLUDED.calendar_url,
          provider = EXCLUDED.provider,
          blocked_dates = EXCLUDED.blocked_dates,
          last_sync_at = EXCLUDED.last_sync_at,
          updated_at = now(),
          etag = EXCLUDED.etag,
          last_modified = EXCLUDED.last_modified
      `
      : `
        INSERT INTO ${sourceTable}
          (property_id, source_id, calendar_name, calendar_url, blocked_dates, last_sync_at, updated_at, etag, last_modified)
        VALUES
          ($1,$2,$3,$4,$5,$6, now(), $7, $8)
        ON CONFLICT (property_id, source_id)
        DO UPDATE SET
          calendar_name = EXCLUDED.calendar_name,
          calendar_url = EXCLUDED.calendar_url,
          blocked_dates = EXCLUDED.blocked_dates,
          last_sync_at = EXCLUDED.last_sync_at,
          updated_at = now(),
          etag = EXCLUDED.etag,
          last_modified = EXCLUDED.last_modified
      `,
    providerColumnExists
      ? [
          propertyId,
          sourceId,
          calendarName,
          calendarUrl,
          String(provider || "").trim() || "generic",
          blockedDatesText,
          lastSyncAt,
          etag,
          lastModified,
        ]
      : [propertyId, sourceId, calendarName, calendarUrl, blockedDatesText, lastSyncAt, etag, lastModified]
  );
}
