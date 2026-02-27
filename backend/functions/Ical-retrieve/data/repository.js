import Database from "database";
import { DatabaseException } from "../util/exception/databaseException.js";

export class Repository {
  async hasProviderColumn(client) {
    try {
      const rows = await client.query(
        `
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'property_ical_source'
          AND column_name = 'provider'
        LIMIT 1
        `
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  async listSources(propertyId) {
    const client = await Database.getInstance();
    const providerColumnExists = await this.hasProviderColumn(client);

    const rows = await client.query(
      providerColumnExists
        ? `
          SELECT
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
          FROM property_ical_source
          WHERE property_id = $1
          ORDER BY updated_at DESC
          `
        : `
          SELECT
            property_id AS "propertyId",
            source_id AS "sourceId",
            calendar_name AS "calendarName",
            calendar_url AS "calendarUrl",
            blocked_dates AS "blockedDates",
            last_sync_at AS "lastSyncAt",
            updated_at AS "updatedAt",
            etag AS "etag",
            last_modified AS "lastModified"
          FROM property_ical_source
          WHERE property_id = $1
          ORDER BY updated_at DESC
          `,
      [propertyId]
    );

    return Array.isArray(rows) ? rows : [];
  }

  async upsertSource({
    propertyId,
    sourceId,
    calendarName,
    calendarUrl,
    provider,
    blockedDatesText,
    lastSyncAt,
    etag,
    lastModified,
  }) {
    const client = await Database.getInstance();
    const providerColumnExists = await this.hasProviderColumn(client);

    try {
      await client.query(
        providerColumnExists
          ? `
            INSERT INTO property_ical_source
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
            INSERT INTO property_ical_source
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
    } catch (e) {
      throw new DatabaseException("Failed to save calendar source");
    }
  }

  async deleteSource(propertyId, sourceId) {
    const client = await Database.getInstance();
    try {
      await client.query(`DELETE FROM property_ical_source WHERE property_id = $1 AND source_id = $2`, [propertyId, sourceId]);
    } catch {
      throw new DatabaseException("Failed to delete calendar source");
    }
  }
}
