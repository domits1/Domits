import Database from "database";

export class PropertyRepository {
  quoteIdentifier(identifier) {
    return `"${String(identifier).replaceAll('"', '""')}"`;
  }

  getSchemaName(client) {
    const schema = client?.options?.schema;
    if (typeof schema !== "string") {
      return null;
    }
    const normalized = schema.trim();
    return normalized || null;
  }

  getPropertyTableName(client) {
    const schemaName = this.getSchemaName(client);
    if (!schemaName) {
      return "property";
    }
    return `${this.quoteIdentifier(schemaName)}.${this.quoteIdentifier("property")}`;
  }

  async getHostIdByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const propertyTable = this.getPropertyTableName(client);
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
