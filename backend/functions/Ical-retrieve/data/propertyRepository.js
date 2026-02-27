import Database from "database";

export class PropertyRepository {
  async getHostIdByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT hostid
        FROM property
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
