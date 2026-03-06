import Database from "database";
import { DatabaseException } from "../../util/exception/DatabaseException.js";

const quoteIdentifier = (value) => `"${String(value || "").replaceAll('"', '""')}"`;

const getSchemaName = (client) => {
  const schema = client?.options?.schema;
  if (typeof schema !== "string") {
    return "";
  }
  const normalized = schema.trim();
  return normalized ? quoteIdentifier(normalized) : "";
};

const getOverrideTableName = (client) => {
  const tableName = quoteIdentifier("property_calendar_override");
  const schemaName = getSchemaName(client);
  if (!schemaName) {
    return tableName;
  }
  return `${schemaName}.${tableName}`;
};

const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const normalizeDateForStorage = (value) => {
  const parsed = toInteger(value);
  if (!parsed || parsed < 10000101 || parsed > 99991231) {
    return null;
  }
  return parsed;
};

const normalizeOptionalPrice = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = toInteger(value);
  if (!parsed || parsed < 2) {
    return null;
  }
  return parsed;
};

const normalizeOptionalAvailability = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return Boolean(value);
};

const mapRowToOverride = (row) => ({
  propertyId: String(row?.property_id || ""),
  date: toInteger(row?.calendar_date),
  isAvailable:
    row?.is_available === null || row?.is_available === undefined
      ? null
      : Boolean(row.is_available),
  nightlyPrice:
    row?.nightly_price === null || row?.nightly_price === undefined
      ? null
      : toInteger(row.nightly_price),
  updatedAt: toInteger(row?.updated_at),
});

export class PropertyCalendarOverrideRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getOverridesByPropertyId(propertyId, range = {}) {
    const client = await Database.getInstance();
    const tableName = getOverrideTableName(client);
    const params = [propertyId];
    const where = ["property_id = $1"];

    const startDate = normalizeDateForStorage(range?.startDate);
    const endDate = normalizeDateForStorage(range?.endDate);

    if (startDate) {
      params.push(startDate);
      where.push(`calendar_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      where.push(`calendar_date <= $${params.length}`);
    }

    try {
      const rows = await client.query(
        `
          SELECT
            property_id,
            calendar_date,
            is_available,
            nightly_price,
            updated_at
          FROM ${tableName}
          WHERE ${where.join(" AND ")}
          ORDER BY calendar_date ASC
        `,
        params
      );
      return (Array.isArray(rows) ? rows : []).map(mapRowToOverride);
    } catch (error) {
      throw new DatabaseException(
        error?.message || "Could not fetch property calendar overrides."
      );
    }
  }

  resolveReturnRange(overrides, range = {}) {
    const startDate = normalizeDateForStorage(range?.startDate);
    const endDate = normalizeDateForStorage(range?.endDate);
    if (startDate && endDate) {
      return {
        startDate: Math.min(startDate, endDate),
        endDate: Math.max(startDate, endDate),
      };
    }

    const overrideDates = (Array.isArray(overrides) ? overrides : [])
      .map((override) => normalizeDateForStorage(override?.calendarDate ?? override?.date))
      .filter(Boolean);

    if (overrideDates.length === 0) {
      return {};
    }

    return {
      startDate: startDate || Math.min(...overrideDates),
      endDate: endDate || Math.max(...overrideDates),
    };
  }

  async upsertOverridesByPropertyId(propertyId, overrides, range = {}) {
    const normalizedOverrides = Array.from(
      new Map(
        (Array.isArray(overrides) ? overrides : [])
          .map((override) => {
            const calendarDate = normalizeDateForStorage(
              override?.calendarDate ?? override?.date
            );
            if (!calendarDate) {
              return null;
            }

            return [
              calendarDate,
              {
                calendarDate,
                isAvailable: normalizeOptionalAvailability(override?.isAvailable),
                nightlyPrice: normalizeOptionalPrice(override?.nightlyPrice),
              },
            ];
          })
          .filter(Boolean)
      ).values()
    );

    if (normalizedOverrides.length === 0) {
      return await this.getOverridesByPropertyId(
        propertyId,
        this.resolveReturnRange([], range)
      );
    }

    const client = await Database.getInstance();
    const tableName = getOverrideTableName(client);
    const updatedAt = Date.now();

    try {
      await client.transaction(async (transactionManager) => {
        for (const override of normalizedOverrides) {
          if (override.isAvailable === null && override.nightlyPrice === null) {
            await transactionManager.query(
              `
                DELETE FROM ${tableName}
                WHERE property_id = $1 AND calendar_date = $2
              `,
              [propertyId, override.calendarDate]
            );
            continue;
          }

          await transactionManager.query(
            `
              INSERT INTO ${tableName}
                (property_id, calendar_date, is_available, nightly_price, updated_at)
              VALUES
                ($1, $2, $3, $4, $5)
              ON CONFLICT (property_id, calendar_date)
              DO UPDATE SET
                is_available = EXCLUDED.is_available,
                nightly_price = EXCLUDED.nightly_price,
                updated_at = EXCLUDED.updated_at
            `,
            [
              propertyId,
              override.calendarDate,
              override.isAvailable,
              override.nightlyPrice,
              updatedAt,
            ]
          );
        }
      });
    } catch (error) {
      throw new DatabaseException(
        error?.message || "Could not update property calendar overrides."
      );
    }

    return await this.getOverridesByPropertyId(
      propertyId,
      this.resolveReturnRange(normalizedOverrides, range)
    );
  }
}
