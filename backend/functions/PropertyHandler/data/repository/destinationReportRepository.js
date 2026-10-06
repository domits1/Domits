import Database from "database";

const resolveSchemaName = (client) => {
  if (process.env.TEST === "true") {
    return "test";
  }

  const configuredSchema = client?.options?.schema;
  if (typeof configuredSchema === "string" && configuredSchema.trim()) {
    return configuredSchema.trim();
  }

  return "main";
};

export class DestinationReportRepository {
  async listActiveLocationCounts() {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);

    const rows = await client.query(
      `SELECT l.country, l.city, count(*) AS active_count
      FROM ${schemaName}.property p
      JOIN ${schemaName}.property_location l ON l.property_id = p.id
      WHERE p.status = $1
      GROUP BY l.country, l.city
      ORDER BY l.country ASC, l.city ASC`,
      ["ACTIVE"]
    );

    return (Array.isArray(rows) ? rows : []).map((row) => ({
      country: String(row.country ?? ""),
      city: String(row.city ?? ""),
      active_count: Number(row.active_count) || 0,
    }));
  }
}

export default DestinationReportRepository;
