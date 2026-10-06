import Database from "database";

export const MAX_BATCH_SIZE = 500;
const CONFLICT_ATTEMPTS = 3;

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

const destinationTableName = (schemaName) => `${schemaName}.destination`;
const mappingTableName = (schemaName) => `${schemaName}.property_destination`;
const locationTableName = (schemaName) => `${schemaName}.property_location`;
const propertyTableName = (schemaName) => `${schemaName}.property`;

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

const requireText = (value, label) => {
  const text = String(value ?? "");
  if (!text.trim()) {
    throw new Error(`${label} is required.`);
  }
  return text;
};

export const isConcurrencyConflict = (error) =>
  [error?.code, error?.driverError?.code].includes("40001") || /\bOC00[01]\b/.test(String(error?.message ?? ""));

const retryOnConflict = async (run) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= CONFLICT_ATTEMPTS || !isConcurrencyConflict(error)) {
        throw error;
      }
    }
  }
};

const upsertDestinationStatement = (tableName) => `INSERT INTO ${tableName} AS d (
        id, type, parent_id, slug, path, display_name, country_code, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      ON CONFLICT (id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = EXCLUDED.updated_at
      WHERE d.display_name IS DISTINCT FROM EXCLUDED.display_name`;

export class DestinationRepository {
  async syncPropertyDestination(propertyId, chain, { sourceCountry, sourceCity, now = Date.now() } = {}) {
    const normalizedPropertyId = requireText(propertyId, "A property id").trim();
    const country = requireText(sourceCountry, "The source country");
    const city = String(sourceCity ?? "");
    if (!chain?.continent || !chain?.country) {
      throw new Error("A resolved destination chain is required.");
    }
    const target = chain.city || chain.country;

    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const destinations = destinationTableName(schemaName);
    const mappings = mappingTableName(schemaName);
    const locations = locationTableName(schemaName);

    return retryOnConflict(() =>
      client.transaction(async (manager) => {
        const rows = [
          [chain.continent, null, null],
          [chain.country, chain.continent.path, chain.country.code],
          ...(chain.city ? [[chain.city, chain.country.path, chain.country.code]] : []),
        ];
        for (const [destination, parentId, countryCode] of rows) {
          await manager.queryRunner.query(
            upsertDestinationStatement(destinations),
            [
              destination.path,
              destination.type,
              parentId,
              destination.slug,
              destination.path,
              destination.name,
              countryCode,
              now,
            ],
            true
          );
        }

        const result = await manager.queryRunner.query(
          `INSERT INTO ${mappings} (property_id, destination_id, source_country, source_city, created_at, updated_at)
      SELECT l.property_id, $2, l.country, l.city, $3, $3
      FROM ${locations} l
      WHERE l.property_id = $1
        AND l.country = $4
        AND l.city = $5
      ON CONFLICT (property_id)
      DO UPDATE SET
        destination_id = EXCLUDED.destination_id,
        source_country = EXCLUDED.source_country,
        source_city = EXCLUDED.source_city,
        updated_at = EXCLUDED.updated_at
      RETURNING property_id`,
          [normalizedPropertyId, target.path, now, country, city],
          true
        );

        return (Array.isArray(result?.records) ? result.records : []).length > 0;
      })
    );
  }

  async removePropertyDestination(propertyId, { sourceCountry, sourceCity } = {}) {
    const normalizedPropertyId = requireText(propertyId, "A property id").trim();
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);

    const { records } = await runStatement(
      client,
      `DELETE FROM ${mappingTableName(schemaName)} m
      WHERE m.property_id = $1
        AND EXISTS (
          SELECT 1
          FROM ${locationTableName(schemaName)} l
          WHERE l.property_id = $1
            AND l.country = $2
            AND l.city = $3
        )
      RETURNING property_id`,
      [normalizedPropertyId, String(sourceCountry ?? ""), String(sourceCity ?? "")]
    );

    return records.length > 0;
  }

  async getLocationForMapping(propertyId) {
    const normalizedPropertyId = requireText(propertyId, "A property id").trim();
    const client = await Database.getInstance();
    const locations = locationTableName(resolveSchemaName(client));

    const rows = await client.query(
      `SELECT property_id, country, city
      FROM ${locations}
      WHERE property_id = $1`,
      [normalizedPropertyId]
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    return row
      ? { propertyId: String(row.property_id), country: String(row.country ?? ""), city: String(row.city ?? "") }
      : null;
  }

  async listPropertyIdsNeedingMapping({ after = "", limit = 100 } = {}) {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);
    const normalizedLimit = Math.min(Math.max(Math.trunc(Number(limit) || 0), 1), MAX_BATCH_SIZE);

    const rows = await client.query(
      `SELECT p.id
      FROM ${propertyTableName(schemaName)} p
      JOIN ${locationTableName(schemaName)} l ON l.property_id = p.id
      LEFT JOIN ${mappingTableName(schemaName)} d ON d.property_id = p.id
      WHERE p.id > $1
        AND (d.property_id IS NULL OR d.source_country <> l.country OR d.source_city <> l.city)
      ORDER BY p.id ASC
      LIMIT $2`,
      [String(after || ""), normalizedLimit]
    );

    return (Array.isArray(rows) ? rows : []).map((row) => String(row.id));
  }
}

export default DestinationRepository;
