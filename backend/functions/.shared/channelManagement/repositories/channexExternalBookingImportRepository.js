import { createHash, randomUUID } from "node:crypto";

import Database from "../../integrations/ORM/index.js";

const CHANNEL_CHANNEX = "CHANNEX";
const BOOKING_STATUS_PAID = "Paid";
const BOOKING_STATUS_CANCELLED = "Cancelled";
const BOOKING_TYPE_CHANNEX = "channex";

const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const quoteIdentifier = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
const resolveDatabaseSchemaName = (client) => {
  if (process.env.TEST === "true") return "test";

  const schema = requireStr(client?.options?.schema);
  if (!schema) return "main";

  return schema.toLowerCase() === "public" ? "main" : schema.trim().toLowerCase();
};
const qualifyTableName = (client, tableName) =>
  `${quoteIdentifier(resolveDatabaseSchemaName(client))}.${quoteIdentifier(tableName)}`;

export const buildDeterministicChannexBookingId = (integrationAccountId, externalReservationId) => {
  const seed = `${CHANNEL_CHANNEX}:${requireStr(integrationAccountId) || ""}:${requireStr(externalReservationId) || ""}`;
  const hex = createHash("sha256").update(seed).digest("hex");
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
};

const normalizeBookingRow = (row) => {
  if (!row) return null;

  return {
    id: requireStr(row.id),
    propertyId: requireStr(row.property_id),
    hostId: requireStr(row.hostid),
    guestId: requireStr(row.guestid),
    guestName: requireStr(row.guestname),
    arrivalDateMs: Number(row.arrivaldate),
    departureDateMs: Number(row.departuredate),
    status: requireStr(row.status),
    paymentId: requireStr(row.paymentid),
    bookingType: requireStr(row.bookingtype),
  };
};

class ChannexExternalBookingImportRepository {
  async getDomitsPropertyContext(domitsPropertyId) {
    const normalizedPropertyId = requireStr(domitsPropertyId);
    if (!normalizedPropertyId) return null;

    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT id, hostid, title, bookingtype
        FROM ${qualifyTableName(client, "property")}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedPropertyId]
    );
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) return null;

    return {
      propertyId: requireStr(row.id),
      hostId: requireStr(row.hostid),
      propertyName: requireStr(row.title),
      bookingType: requireStr(row.bookingtype),
    };
  }

  async getBookingById(bookingId) {
    const normalizedBookingId = requireStr(bookingId);
    if (!normalizedBookingId) return null;

    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT id, property_id, hostid, guestid, guestname, arrivaldate, departuredate, status, paymentid, bookingtype
        FROM ${qualifyTableName(client, "booking")}
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedBookingId]
    );

    return normalizeBookingRow(Array.isArray(rows) && rows.length ? rows[0] : null);
  }

  async createExternalBooking({
    bookingId,
    propertyId,
    hostId,
    externalReservationId,
    guestName,
    arrivalDateMs,
    departureDateMs,
  }) {
    const client = await Database.getInstance();
    const now = Date.now();
    const normalizedExternalReservationId = requireStr(externalReservationId) || randomUUID();
    const row = {
      id: requireStr(bookingId) || randomUUID(),
      arrivaldate: Math.trunc(Number(arrivalDateMs)),
      departuredate: Math.trunc(Number(departureDateMs)),
      createdat: now,
      guestid: `CHANNEX_GUEST:${normalizedExternalReservationId}`,
      guests: 1,
      hostid: requireStr(hostId),
      latepayment: false,
      paymentid: `CHANNEX:${normalizedExternalReservationId}`,
      property_id: requireStr(propertyId),
      status: BOOKING_STATUS_PAID,
      guestname: requireStr(guestName) || "Channex guest",
      hostname: "Channex",
      cancellation_policy: null,
      bookingtype: BOOKING_TYPE_CHANNEX,
    };

    await client.query(
      `
        INSERT INTO ${qualifyTableName(client, "booking")}
          (id, arrivaldate, departuredate, createdat, guestid, guests, hostid, latepayment, paymentid,
           property_id, status, guestname, hostname, cancellation_policy, bookingtype)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        row.id,
        row.arrivaldate,
        row.departuredate,
        row.createdat,
        row.guestid,
        row.guests,
        row.hostid,
        row.latepayment,
        row.paymentid,
        row.property_id,
        row.status,
        row.guestname,
        row.hostname,
        row.cancellation_policy,
        row.bookingtype,
      ]
    );

    return this.getBookingById(row.id);
  }

  async updateImportedBooking({ bookingId, guestName, arrivalDateMs, departureDateMs }) {
    const normalizedBookingId = requireStr(bookingId);
    if (!normalizedBookingId) return null;

    const client = await Database.getInstance();
    await client.query(
      `
        UPDATE ${qualifyTableName(client, "booking")}
        SET arrivaldate = $2,
            departuredate = $3,
            guestname = $4,
            status = $5
        WHERE id = $1
      `,
      [
        normalizedBookingId,
        Math.trunc(Number(arrivalDateMs)),
        Math.trunc(Number(departureDateMs)),
        requireStr(guestName) || "Channex guest",
        BOOKING_STATUS_PAID,
      ]
    );

    return this.getBookingById(normalizedBookingId);
  }

  async cancelImportedBooking(bookingId) {
    const normalizedBookingId = requireStr(bookingId);
    if (!normalizedBookingId) return null;

    const client = await Database.getInstance();
    await client.query(
      `
        UPDATE ${qualifyTableName(client, "booking")}
        SET status = $2
        WHERE id = $1
      `,
      [normalizedBookingId, BOOKING_STATUS_CANCELLED]
    );

    return this.getBookingById(normalizedBookingId);
  }
}

export default ChannexExternalBookingImportRepository;
