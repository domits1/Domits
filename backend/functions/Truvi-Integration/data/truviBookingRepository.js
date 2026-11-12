import Database from "database";

const PAID_STATUS = "Paid";
const PETS_RULE = "PetsAllowed";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

const normalizeLimit = (limit) => {
  const value = Number(limit);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(value, MAX_LIMIT);
};

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const toScreeningInput = (row, rules) => ({
  booking: {
    id: row.id,
    arrivaldate: toNumber(row.arrivaldate),
    departuredate: toNumber(row.departuredate),
    createdat: toNumber(row.createdat),
    guestname: row.guestname,
    guest_email: row.guest_email || null,
  },
  property: { id: row.property_id, title: row.title },
  location: row.country
    ? {
        street: row.street,
        housenumber: row.housenumber,
        housenumberextension: row.housenumberextension || null,
        city: row.city,
        country: row.country,
        postalcode: row.postalcode,
      }
    : null,
  rules,
  guestId: row.guestid,
  hostId: row.hostid,
  hostName: row.hostname,
  bookingSource: row.booking_source || null,
});

export class TruviBookingRepository {
  async listBookingsToScreen({ now = Date.now(), limit } = {}) {
    const client = await Database.getInstance();
    const schema = resolveSchemaName(client);

    const rows = await client.query(
      `SELECT b.id, b.arrivaldate, b.departuredate, b.createdat, b.guestid, b.guestname, b.guest_email,
        b.hostid, b.hostname, b.property_id, b.booking_source,
        p.title,
        l.street, l.housenumber, l.housenumberextension, l.city, l.country, l.postalcode
      FROM ${schema}.booking b
      JOIN ${schema}.property p ON p.id = b.property_id
      LEFT JOIN ${schema}.property_location l ON l.property_id = b.property_id
      LEFT JOIN ${schema}.guest_risk_assessment g ON g.id = 'truvi:' || b.id
      WHERE b.status = $1 AND b.arrivaldate > $2 AND g.id IS NULL
      ORDER BY b.arrivaldate ASC
      LIMIT $3`,
      [PAID_STATUS, now, normalizeLimit(limit)]
    );
    const bookings = Array.isArray(rows) ? rows : [];
    if (bookings.length === 0) {
      return [];
    }

    const propertyIds = [...new Set(bookings.map((row) => row.property_id))];
    const placeholders = propertyIds.map((_, index) => `$${index + 2}`).join(", ");
    const ruleRows = await client.query(
      `SELECT property_id, rule, value FROM ${schema}.property_rule WHERE rule = $1 AND property_id IN (${placeholders})`,
      [PETS_RULE, ...propertyIds]
    );
    const rulesByProperty = new Map();
    for (const rule of Array.isArray(ruleRows) ? ruleRows : []) {
      const list = rulesByProperty.get(rule.property_id) || [];
      list.push({ property_id: rule.property_id, rule: rule.rule, value: rule.value === true || rule.value === "true" });
      rulesByProperty.set(rule.property_id, list);
    }

    return bookings.map((row) => toScreeningInput(row, rulesByProperty.get(row.property_id) || []));
  }
}

export default TruviBookingRepository;