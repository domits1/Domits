import Database from "database";
import { DatabaseException } from "../util/exception/databaseException.js";
import { listSourcesByProperty, upsertSourceRecord } from "../.shared/icalSourceRepositoryHelpers.js";

export class Repository {
  async listSources(propertyId) {
    const client = await Database.getInstance();
    return listSourcesByProperty(client, propertyId, { order: "DESC" });
  }

  async upsertSource(payload) {
    const client = await Database.getInstance();
    try {
      await upsertSourceRecord(client, payload);
    } catch {
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
