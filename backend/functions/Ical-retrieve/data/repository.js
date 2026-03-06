import Database from "database";
import { DatabaseException } from "../util/exception/databaseException.js";
import { listSourcesByProperty, upsertSourceRecord } from "../.shared/icalSourceRepositoryHelpers.js";

export class Repository {
  quoteIdentifier(identifier) {
    return `"${String(identifier).replaceAll('"', '""')}"`;
  }

  isValidSchemaName(value) {
    return typeof value === "string" && /^[A-Za-z_]\w*$/.test(value.trim());
  }

  getSchemaName(client) {
    if (process.env.TEST === "true") {
      return "test";
    }

    const schema = client?.options?.schema;
    if (this.isValidSchemaName(schema)) {
      const normalized = schema.trim().toLowerCase();
      if (normalized === "public") {
        return "main";
      }
      return normalized;
    }
    return "main";
  }

  getIcalSourceTableName(client) {
    const schemaName = this.getSchemaName(client);
    if (!schemaName) {
      return "property_ical_source";
    }
    return `${this.quoteIdentifier(schemaName)}.${this.quoteIdentifier("property_ical_source")}`;
  }

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
    const sourceTable = this.getIcalSourceTableName(client);
    try {
      await client.query(`DELETE FROM ${sourceTable} WHERE property_id = $1 AND source_id = $2`, [propertyId, sourceId]);
    } catch {
      throw new DatabaseException("Failed to delete calendar source");
    }
  }
}
