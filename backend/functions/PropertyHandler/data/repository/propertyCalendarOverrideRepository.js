import Database from "database";
import { DatabaseException } from "../../util/exception/DatabaseException.js";

const quoteIdentifier = (value) => `"${String(value || "").replaceAll('"', '""')}"`;

const isValidSchemaName = (value) =>
  typeof value === "string" && /^[A-Za-z_]\w*$/.test(value.trim());

const getSchemaName = (client) => {
  if (process.env.TEST === "true") {
    return quoteIdentifier("test");
  }

  const schema = client?.options?.schema;
  if (isValidSchemaName(schema)) {
    const normalized = schema.trim().toLowerCase();
    if (normalized === "public") {
      return quoteIdentifier("main");
    }
    return quoteIdentifier(normalized);
  }
  return quoteIdentifier("main");
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

const normalizeOptionalNonNegativeInteger = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const parsed = toInteger(value);
  if (parsed === null || parsed < 0) {
    return null;
  }
  return parsed;
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
  priceLabsPrice:
    row?.pricelabs_price === null || row?.pricelabs_price === undefined
      ? null
      : toInteger(row.pricelabs_price),
  stopSell:
    row?.stop_sell === null || row?.stop_sell === undefined
      ? null
      : Boolean(row.stop_sell),
  closedToArrival:
    row?.closed_to_arrival === null || row?.closed_to_arrival === undefined
      ? null
      : Boolean(row.closed_to_arrival),
  closedToDeparture:
    row?.closed_to_departure === null || row?.closed_to_departure === undefined
      ? null
      : Boolean(row.closed_to_departure),
  minStay:
    row?.min_stay === null || row?.min_stay === undefined
      ? null
      : toInteger(row.min_stay),
  maxStay:
    row?.max_stay === null || row?.max_stay === undefined
      ? null
      : toInteger(row.max_stay),
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
            pricelabs_price,
            stop_sell,
            closed_to_arrival,
            closed_to_departure,
            min_stay,
            max_stay,
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
                stopSell: normalizeOptionalAvailability(override?.stopSell),
                closedToArrival: normalizeOptionalAvailability(override?.closedToArrival),
                closedToDeparture: normalizeOptionalAvailability(override?.closedToDeparture),
                minStay: normalizeOptionalNonNegativeInteger(override?.minStay),
                maxStay: normalizeOptionalNonNegativeInteger(override?.maxStay),
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
          if (
            override.isAvailable === null &&
            override.nightlyPrice === null &&
            override.stopSell === null &&
            override.closedToArrival === null &&
            override.closedToDeparture === null &&
            override.minStay === null &&
            override.maxStay === null
          ) {
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
                (
                  property_id,
                  calendar_date,
                  is_available,
                  nightly_price,
                  stop_sell,
                  closed_to_arrival,
                  closed_to_departure,
                  min_stay,
                  max_stay,
                  updated_at
                )
              VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (property_id, calendar_date)
              DO UPDATE SET
                is_available = EXCLUDED.is_available,
                nightly_price = EXCLUDED.nightly_price,
                stop_sell = EXCLUDED.stop_sell,
                closed_to_arrival = EXCLUDED.closed_to_arrival,
                closed_to_departure = EXCLUDED.closed_to_departure,
                min_stay = EXCLUDED.min_stay,
                max_stay = EXCLUDED.max_stay,
                updated_at = EXCLUDED.updated_at
            `,
            [
              propertyId,
              override.calendarDate,
              override.isAvailable,
              override.nightlyPrice,
              override.stopSell,
              override.closedToArrival,
              override.closedToDeparture,
              override.minStay,
              override.maxStay,
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

