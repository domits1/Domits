import Database from "database";

export const ACCOMMODATION_IMAGE_BASE_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

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

const toRows = (rows) => (Array.isArray(rows) ? rows : []);

const toDestination = (row) => ({
  id: String(row.id),
  type: String(row.type),
  parentId: row.parent_id ? String(row.parent_id) : null,
  slug: String(row.slug),
  path: String(row.path),
  name: String(row.display_name),
  countryCode: row.country_code ? String(row.country_code) : null,
  activeListings: Number(row.active_listings) || 0,
});

export const buildAccommodationImageUrl = (key) => {
  const normalizedKey = String(key || "").replace(/^\/+/, "");
  return normalizedKey ? `${ACCOMMODATION_IMAGE_BASE_URL}${normalizedKey}` : "";
};

export class DestinationPageRepository {
  async listDestinationsWithActiveListings() {
    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);

    const rows = await client.query(
      `SELECT d.id, d.type, d.parent_id, d.slug, d.path, d.display_name, d.country_code,
        count(p.id) AS active_listings
      FROM ${schemaName}.destination d
      LEFT JOIN ${schemaName}.property_destination m ON m.destination_id = d.id
      LEFT JOIN ${schemaName}.property p ON p.id = m.property_id AND p.status = $1
      GROUP BY d.id, d.type, d.parent_id, d.slug, d.path, d.display_name, d.country_code
      ORDER BY d.path ASC`,
      ["ACTIVE"]
    );

    return toRows(rows).map(toDestination);
  }

  async listActiveListingsUnderPath(path) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) {
      return [];
    }

    const client = await Database.getInstance();
    const schemaName = resolveSchemaName(client);

    const rows = await client.query(
      `SELECT p.id, p.title, l.city, l.country, pr.roomrate, d.path,
        (SELECT v.s3_key
         FROM ${schemaName}.property_image_v2 i
         JOIN ${schemaName}.property_image_variant v ON v.image_id = i.id AND v.variant = 'web'
         WHERE i.property_id = p.id AND i.status = 'READY'
         ORDER BY i.sort_order ASC, i.id ASC
         LIMIT 1) AS image_key
      FROM ${schemaName}.property_destination m
      JOIN ${schemaName}.destination d ON d.id = m.destination_id
      JOIN ${schemaName}.property p ON p.id = m.property_id AND p.status = $1
      JOIN ${schemaName}.property_location l ON l.property_id = p.id
      LEFT JOIN ${schemaName}.property_pricing pr ON pr.property_id = p.id
      WHERE d.path = $2 OR d.path LIKE $3
      ORDER BY p.createdat DESC, p.id ASC`,
      ["ACTIVE", normalizedPath, `${normalizedPath.replace(/[\\%_]/g, "\\$&")}/%`]
    );

    return toRows(rows).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ""),
      city: String(row.city ?? ""),
      country: String(row.country ?? ""),
      nightlyRate: Number(row.roomrate) || 0,
      imageUrl: buildAccommodationImageUrl(row.image_key),
      destinationPath: String(row.path ?? ""),
    }));
  }
}

export default DestinationPageRepository;
