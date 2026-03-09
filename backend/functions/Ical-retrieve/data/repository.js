import Database from "database";
import { DatabaseException } from "../util/exception/databaseException.js";
import { listSourcesByProperty, upsertSourceRecord } from "../../.shared/icalSourceRepositoryHelpers.js";
import { resolveQualifiedTableName } from "./schemaUtils.js";

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
    const sourceTable = resolveQualifiedTableName(client, "property_ical_source");
    try {
      await client.query(`DELETE FROM ${sourceTable} WHERE property_id = $1 AND source_id = $2`, [propertyId, sourceId]);
    } catch {
      throw new DatabaseException("Failed to delete calendar source");
    }
  }
}
