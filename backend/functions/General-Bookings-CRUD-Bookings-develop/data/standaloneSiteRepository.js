import Database from "database";
import { qualifyTableName } from "./propertyRepository.js";

class StandaloneSiteRepository {
  async getSiteById(siteId) {
    const normalizedSiteId = String(siteId || "").trim();
    if (!normalizedSiteId) {
      return null;
    }

    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT id, property_id, host_id, status
        FROM ${qualifyTableName(client, "standalone_site")}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedSiteId]
    );

    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      propertyId: String(row.property_id || ""),
      hostId: String(row.host_id || ""),
      status: String(row.status || ""),
    };
  }
}

export default StandaloneSiteRepository;
