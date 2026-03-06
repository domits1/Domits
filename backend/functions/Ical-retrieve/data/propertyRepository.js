import Database from "database";
import { resolveQualifiedTableName } from "./schemaUtils.js";

export class PropertyRepository {
  async getHostIdByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const propertyTable = resolveQualifiedTableName(client, "property");
    const rows = await client.query(
      `
        SELECT hostid
        FROM ${propertyTable}
        WHERE id = $1
        LIMIT 1
      `,
      [propertyId]
    );

    if (!Array.isArray(rows) || rows.length < 1) {
      return null;
    }

    return rows[0]?.hostid ? String(rows[0].hostid) : null;
  }
}
