import Database from "database";
import { DatabaseException } from "../util/exception/databaseException.js";

export class Repository {
  async listSources(propertyId) {
    const client = await Database.getInstance();
    const rows = await client.query(
      `
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
    blockedDatesText,
    lastSyncAt,
    etag,
    lastModified,
  }) {
    const client = await Database.getInstance();

    try {
      await client.query(
        `
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
        [propertyId, sourceId, calendarName, calendarUrl, blockedDatesText, lastSyncAt, etag, lastModified]
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