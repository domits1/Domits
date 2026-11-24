import Database from "../../integrations/ORM/index.js";
import { qualifyTableName } from "../utils/channexAriPayloadUtils.js";

// Loads one listing in the shape listingDistributionReadiness reads (design note D3, #506).
// Raw SQL like getPropertyPricing: the shared ORM does not load the pricing and detail entities.
// LEFT JOINs on purpose: a listing without a location, "Guests" detail or price row must come
// back with nulls, so the readiness check can tell the host what is missing.

// Numbers from the driver may arrive as strings; anything that is not a finite number becomes null.
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export default class ListingDistributionRepository {
  async findListing(propertyId) {
    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT p.id, p.hostid, p.status, l.country, g.value AS guests, pr.roomrate
        FROM ${qualifyTableName(client, "property")} p
        LEFT JOIN ${qualifyTableName(client, "property_location")} l ON l.property_id = p.id
        LEFT JOIN ${qualifyTableName(client, "property_generaldetail")} g
          ON g.property_id = p.id AND g.detail = 'Guests'
        LEFT JOIN ${qualifyTableName(client, "property_pricing")} pr ON pr.property_id = p.id
        WHERE p.id = $1
        LIMIT 1
      `,
      [propertyId]
    );

    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!row) return null;

    return {
      propertyId: row.id,
      hostId: row.hostid,
      status: row.status,
      location: row.country == null ? null : { country: row.country },
      guests: toNumberOrNull(row.guests),
      roomRate: toNumberOrNull(row.roomrate),
    };
  }
}
